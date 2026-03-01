import { NextRequest } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { SafetyDocumentPDF, SafetyDocumentPDFProps } from '@/lib/pdf/safety-document-pdf'
import { getCompanySettingsForPDF } from '@/lib/pdf/pdf-utils'
import { checkRateLimit } from '@/lib/security/rate-limiter'
import { getClientIp } from '@/lib/api-security'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SafetyDocRow = Record<string, any>

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clientIp = getClientIp(request)
    const rateCheck = await checkRateLimit(clientIp, '/api/pdf/safety-document')
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

    // Tables not in generated types — use `as any` pattern per CLAUDE.md
    const result = await supabase
      .from('safety_documents' as any)
      .select(`
        *,
        category:safety_document_categories(category_code, category_name),
        prepared_by_employee:employees!safety_documents_prepared_by_fkey(full_name),
        reviewed_by_employee:employees!safety_documents_reviewed_by_fkey(full_name),
        approved_by_employee:employees!safety_documents_approved_by_fkey(full_name)
      `)
      .eq('id', id)
      .single()

    const doc = result.data as SafetyDocRow | null
    const docError = result.error

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: 'Safety document not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch JSA hazards if applicable
    const isJSA = doc.category?.category_code?.toLowerCase() === 'jsa'
    let hazards: SafetyDocumentPDFProps['hazards'] = []

    if (isJSA) {
      const jsaResult = await supabase
        .from('jsa_hazards' as any)
        .select('*')
        .eq('document_id', id)
        .order('step_number')

      const jsaData = (jsaResult.data || []) as SafetyDocRow[]

      hazards = jsaData.map((h) => ({
        step_number: h.step_number as number,
        work_step: h.work_step as string,
        hazards: h.hazards as string,
        consequences: h.consequences as string | null,
        risk_level: h.risk_level as string | null,
        control_measures: h.control_measures as string,
        responsible: h.responsible as string | null,
      }))
    }

    // Fetch acknowledgment stats (total active employees = required, acknowledgments = completed)
    const { count: totalEmployees } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    const ackResult = await supabase
      .from('safety_document_acknowledgments' as any)
      .select('*', { count: 'exact', head: true })
      .eq('document_id', id)

    const total = totalEmployees || 0
    const acknowledged = ackResult.count || 0
    const completionRate = total > 0 ? Math.round((acknowledged / total) * 100) : 0

    const company = await getCompanySettingsForPDF()

    const pdfProps: SafetyDocumentPDFProps = {
      document: {
        document_number: doc.document_number,
        title: doc.title,
        description: doc.description,
        version: doc.version || '1.0',
        revision_number: doc.revision_number || 0,
        content: doc.content,
        status: doc.status || 'draft',
        effective_date: doc.effective_date,
        expiry_date: doc.expiry_date,
        applicable_locations: doc.applicable_locations || [],
        applicable_departments: doc.applicable_departments || [],
        applicable_job_types: doc.applicable_job_types || [],
        requires_acknowledgment: doc.requires_acknowledgment || false,
        created_at: doc.created_at,
      },
      category: doc.category
        ? {
            category_code: doc.category.category_code,
            category_name: doc.category.category_name,
          }
        : null,
      preparedBy: doc.prepared_by_employee?.full_name || null,
      reviewedBy: doc.reviewed_by_employee?.full_name || null,
      approvedBy: doc.approved_by_employee?.full_name || null,
      preparedAt: doc.prepared_at || null,
      reviewedAt: doc.reviewed_at || null,
      approvedAt: doc.approved_at || null,
      hazards,
      acknowledgmentStats: {
        total_required: total,
        total_acknowledged: acknowledged,
        completion_rate: completionRate,
      },
      company,
    }

    const buffer = await renderToBuffer(<SafetyDocumentPDF {...pdfProps} />)

    const filename = `${doc.document_number}.pdf`
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
