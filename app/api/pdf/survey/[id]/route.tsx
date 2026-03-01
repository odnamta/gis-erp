import { NextRequest } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { SurveyPDF, SurveyPDFProps } from '@/lib/pdf/survey-pdf'
import { getCompanySettingsForPDF } from '@/lib/pdf/pdf-utils'
import { checkRateLimit } from '@/lib/security/rate-limiter'
import { getClientIp } from '@/lib/api-security'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clientIp = getClientIp(request)
    const rateCheck = await checkRateLimit(clientIp, '/api/pdf/survey')
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil((rateCheck.resetAt.getTime() - Date.now()) / 1000)) },
      })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const download = searchParams.get('download') === 'true'

    const supabase = await createClient()

    // Fetch survey with relations
    const { data: survey, error: surveyError } = await supabase
      .from('route_surveys')
      .select(`
        *,
        customer:customers(id, name),
        project:projects(id, name),
        surveyor:employees!surveyor_id(id, full_name)
      `)
      .eq('id', id)
      .single()

    if (surveyError || !survey) {
      return new Response(JSON.stringify({ error: 'Survey not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch waypoints
    const { data: waypoints } = await supabase
      .from('route_waypoints')
      .select('*')
      .eq('survey_id', id)
      .order('waypoint_order')

    const company = await getCompanySettingsForPDF()

    const pdfProps: SurveyPDFProps = {
      survey: {
        survey_number: survey.survey_number,
        status: survey.status || 'requested',
        cargo_description: survey.cargo_description,
        cargo_weight_tons: survey.cargo_weight_tons,
        total_length_m: survey.total_length_m,
        total_width_m: survey.total_width_m,
        total_height_m: survey.total_height_m,
        total_weight_tons: survey.total_weight_tons,
        origin_location: survey.origin_location,
        origin_address: survey.origin_address,
        destination_location: survey.destination_location,
        destination_address: survey.destination_address,
        route_distance_km: survey.route_distance_km,
        estimated_travel_time_hours: survey.estimated_travel_time_hours,
        survey_date: survey.survey_date,
        surveyor_name: survey.surveyor?.full_name || survey.surveyor_name,
        feasibility: survey.feasibility,
        feasibility_notes: survey.feasibility_notes,
        escort_required: survey.escort_required || false,
        escort_type: survey.escort_type,
        escort_vehicles_count: survey.escort_vehicles_count,
        travel_time_restrictions: survey.travel_time_restrictions,
        survey_cost: survey.survey_cost,
        permit_cost_estimate: survey.permit_cost_estimate,
        escort_cost_estimate: survey.escort_cost_estimate,
        road_repair_cost_estimate: survey.road_repair_cost_estimate,
        total_route_cost_estimate: survey.total_route_cost_estimate,
        notes: survey.notes,
        created_at: survey.created_at || new Date().toISOString(),
      },
      customer: survey.customer ? { name: survey.customer.name } : null,
      project: survey.project ? { name: survey.project.name } : null,
      surveyor: survey.surveyor ? { full_name: survey.surveyor.full_name } : null,
      waypoints: (waypoints || []).map((wp: Record<string, unknown>) => ({
        waypoint_order: wp.waypoint_order as number,
        waypoint_type: wp.waypoint_type as string,
        location_name: wp.location_name as string,
        km_from_start: wp.km_from_start as number | null,
        road_condition: wp.road_condition as string | null,
        road_width_m: wp.road_width_m as number | null,
        vertical_clearance_m: wp.vertical_clearance_m as number | null,
        horizontal_clearance_m: wp.horizontal_clearance_m as number | null,
        bridge_name: wp.bridge_name as string | null,
        bridge_capacity_tons: wp.bridge_capacity_tons as number | null,
        obstacle_type: wp.obstacle_type as string | null,
        obstacle_description: wp.obstacle_description as string | null,
        is_passable: wp.is_passable as boolean,
        action_required: wp.action_required as string | null,
      })),
      company,
    }

    const buffer = await renderToBuffer(<SurveyPDF {...pdfProps} />)

    const filename = `${survey.survey_number}.pdf`
    const disposition = download ? `attachment; filename="${filename}"` : `inline; filename="${filename}"`

    return new Response(buffer as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
      },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to generate PDF' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
