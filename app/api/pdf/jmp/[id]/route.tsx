import { NextRequest } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { JmpPDF, JmpPDFProps } from '@/lib/pdf/jmp-pdf'
import { getCompanySettingsForPDF } from '@/lib/pdf/pdf-utils'
import { checkRateLimit } from '@/lib/security/rate-limiter'
import { getClientIp } from '@/lib/api-security'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clientIp = getClientIp(request)
    const rateCheck = await checkRateLimit(clientIp, '/api/pdf/jmp')
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

    // Fetch JMP with relations
    const { data: jmp, error: jmpError } = await supabase
      .from('journey_management_plans')
      .select(`
        *,
        customer:customers(id, name),
        project:projects(id, name),
        jobOrder:job_orders(id, jo_number),
        convoyCommander:employees!convoy_commander_id(id, full_name, phone)
      `)
      .eq('id', id)
      .single()

    if (jmpError || !jmp) {
      return new Response(JSON.stringify({ error: 'JMP not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch checkpoints
    const { data: checkpoints } = await supabase
      .from('jmp_checkpoints')
      .select('*')
      .eq('jmp_id', id)
      .order('checkpoint_order')

    // Fetch risks
    const { data: risks } = await supabase
      .from('jmp_risk_assessment')
      .select('*')
      .eq('jmp_id', id)

    const company = await getCompanySettingsForPDF()

    const pdfProps: JmpPDFProps = {
      jmp: {
        jmp_number: jmp.jmp_number,
        journey_title: jmp.journey_title,
        journey_description: jmp.journey_description,
        status: jmp.status || 'draft',
        origin_location: jmp.origin_location,
        destination_location: jmp.destination_location,
        route_distance_km: jmp.route_distance_km,
        planned_departure: jmp.planned_departure,
        planned_arrival: jmp.planned_arrival,
        journey_duration_hours: jmp.journey_duration_hours,
        cargo_description: jmp.cargo_description,
        total_weight_tons: jmp.total_weight_tons,
        total_length_m: jmp.total_length_m,
        total_width_m: jmp.total_width_m,
        total_height_m: jmp.total_height_m,
        convoy_configuration: jmp.convoy_configuration as unknown as JmpPDFProps['jmp']['convoy_configuration'],
        weather_restrictions: jmp.weather_restrictions,
        go_no_go_criteria: jmp.go_no_go_criteria,
        emergency_procedures: jmp.emergency_procedures,
        created_at: jmp.created_at || new Date().toISOString(),
        prepared_at: jmp.prepared_at,
        approved_at: jmp.approved_at,
        actual_departure: jmp.actual_departure,
        actual_arrival: jmp.actual_arrival,
        incidents_occurred: jmp.incidents_occurred || false,
        incident_summary: jmp.incident_summary,
        lessons_learned: jmp.lessons_learned,
      },
      customer: jmp.customer ? { name: jmp.customer.name } : null,
      project: jmp.project ? { name: jmp.project.name } : null,
      jobOrder: jmp.jobOrder ? { jo_number: jmp.jobOrder.jo_number } : null,
      convoyCommander: jmp.convoyCommander
        ? { full_name: jmp.convoyCommander.full_name, phone: jmp.convoyCommander.phone || undefined }
        : null,
      checkpoints: (checkpoints || []).map((cp: Record<string, unknown>) => ({
        checkpointOrder: cp.checkpoint_order as number,
        locationName: cp.location_name as string,
        locationType: cp.location_type as string,
        kmFromStart: cp.km_from_start as number | undefined,
        plannedArrival: cp.planned_arrival as string | undefined,
        plannedDeparture: cp.planned_departure as string | undefined,
        stopDurationMinutes: cp.stop_duration_minutes as number | undefined,
        activities: cp.activities as string | undefined,
        status: cp.status as string,
      })),
      risks: (risks || []).map((r: Record<string, unknown>) => ({
        riskCategory: r.risk_category as string,
        riskDescription: r.risk_description as string,
        likelihood: r.likelihood as string,
        consequence: r.consequence as string,
        riskLevel: r.risk_level as string,
        controlMeasures: r.control_measures as string,
        residualRiskLevel: r.residual_risk_level as string | undefined,
        responsible: r.responsible as string | undefined,
      })),
      movementWindows: (jmp.movement_windows || []) as unknown as JmpPDFProps['movementWindows'],
      company,
    }

    const buffer = await renderToBuffer(<JmpPDF {...pdfProps} />)

    const filename = `${jmp.jmp_number}.pdf`
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
