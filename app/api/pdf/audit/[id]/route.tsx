import { NextRequest } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { AuditPDF, AuditPDFProps } from '@/lib/pdf/audit-pdf'
import { getCompanySettingsForPDF } from '@/lib/pdf/pdf-utils'
import { checkRateLimit } from '@/lib/security/rate-limiter'
import { getClientIp } from '@/lib/api-security'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clientIp = getClientIp(request)
    const rateCheck = await checkRateLimit(clientIp, '/api/pdf/audit')
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

    // Fetch audit with relations
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .select(`
        *,
        audit_types(type_code, type_name, category)
      `)
      .eq('id', id)
      .single()

    if (auditError || !audit) {
      return new Response(JSON.stringify({ error: 'Audit not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch audit findings
    const { data: findings } = await supabase
      .from('audit_findings')
      .select('*')
      .eq('audit_id', id)
      .order('finding_number')

    const company = await getCompanySettingsForPDF()

    const pdfProps: AuditPDFProps = {
      audit: {
        audit_number: audit.audit_number,
        status: audit.status || 'scheduled',
        scheduled_date: audit.scheduled_date,
        conducted_date: audit.conducted_date,
        location: audit.location,
        auditor_name: audit.auditor_name,
        overall_score: audit.overall_score,
        overall_rating: audit.overall_rating,
        summary: audit.summary,
        critical_findings: audit.critical_findings || 0,
        major_findings: audit.major_findings || 0,
        minor_findings: audit.minor_findings || 0,
        observations: audit.observations || 0,
        created_at: audit.created_at || new Date().toISOString(),
      },
      auditType: audit.audit_types
        ? {
            type_code: audit.audit_types.type_code,
            type_name: audit.audit_types.type_name,
            category: audit.audit_types.category,
          }
        : null,
      checklistResponses: (audit.checklist_responses || []) as unknown as AuditPDFProps['checklistResponses'],
      findings: (findings || []).map((f: Record<string, unknown>) => ({
        finding_number: f.finding_number as number,
        severity: f.severity as string,
        finding_description: f.finding_description as string,
        corrective_action: f.corrective_action as string | null,
        status: f.status as string,
        category: f.category as string | null,
        location_detail: f.location_detail as string | null,
      })),
      company,
    }

    const buffer = await renderToBuffer(<AuditPDF {...pdfProps} />)

    const filename = `${audit.audit_number || `audit-${id.slice(0, 8)}`}.pdf`
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
