import { NextRequest } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { PermitPDF, PermitPDFProps } from '@/lib/pdf/permit-pdf'
import { getCompanySettingsForPDF } from '@/lib/pdf/pdf-utils'
import { checkRateLimit } from '@/lib/security/rate-limiter'
import { getClientIp } from '@/lib/api-security'

async function getEmployeeName(supabase: Awaited<ReturnType<typeof createClient>>, userId: string | null): Promise<string | null> {
  if (!userId) return null
  const { data } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('user_id', userId)
    .single()
  return data?.full_name || null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clientIp = getClientIp(request)
    const rateCheck = await checkRateLimit(clientIp, '/api/pdf/permit')
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

    // Fetch permit
    const { data: permit, error: permitError } = await supabase
      .from('safety_permits')
      .select('*')
      .eq('id', id)
      .single()

    if (permitError || !permit) {
      return new Response(JSON.stringify({ error: 'Permit not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch employee names separately (avoid deep joins)
    const [requestedByName, supervisorApprovedByName, hseApprovedByName, closedByName] = await Promise.all([
      getEmployeeName(supabase, permit.requested_by),
      getEmployeeName(supabase, permit.supervisor_approved_by),
      getEmployeeName(supabase, permit.hse_approved_by),
      getEmployeeName(supabase, permit.closed_by),
    ])

    // Fetch job order number if linked
    let jobOrderNumber: string | null = null
    if (permit.job_order_id) {
      const { data: jo } = await supabase
        .from('job_orders')
        .select('jo_number')
        .eq('id', permit.job_order_id)
        .single()
      jobOrderNumber = jo?.jo_number || null
    }

    const company = await getCompanySettingsForPDF()

    const pdfProps: PermitPDFProps = {
      permit: {
        permit_number: permit.permit_number,
        permit_type: permit.permit_type || '',
        status: permit.status || 'pending',
        work_description: permit.work_description || '',
        work_location: permit.work_location || '',
        valid_from: permit.valid_from,
        valid_to: permit.valid_to,
        required_ppe: Array.isArray(permit.required_ppe) ? permit.required_ppe : [],
        special_precautions: permit.special_precautions,
        emergency_procedures: permit.emergency_procedures,
        requested_at: permit.requested_at,
        supervisor_approved_at: permit.supervisor_approved_at,
        hse_approved_at: permit.hse_approved_at,
        closed_at: permit.closed_at,
        closure_notes: permit.closure_notes,
        created_at: permit.created_at || new Date().toISOString(),
      },
      requestedByName,
      supervisorApprovedByName,
      hseApprovedByName,
      closedByName,
      jobOrderNumber,
      company,
    }

    let buffer: Buffer
    try {
      buffer = await renderToBuffer(<PermitPDF {...pdfProps} />)
    } catch (renderError) {
      console.error('[PDF Permit] renderToBuffer failed:', renderError)
      const msg = renderError instanceof Error ? renderError.message : 'Unknown render error'
      return new Response(JSON.stringify({ error: 'PDF rendering failed', details: msg }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const filename = `${permit.permit_number || `permit-${id.slice(0, 8)}`}.pdf`
    const disposition = download ? `attachment; filename="${filename}"` : `inline; filename="${filename}"`

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
      },
    })
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error'
    console.error('[PDF Permit] Generation failed:', error)
    return new Response(JSON.stringify({ error: 'Failed to generate PDF', details }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
