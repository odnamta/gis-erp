import { NextRequest } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { BKKPDF, BKKPDFProps } from '@/lib/pdf/bkk-pdf'
import { getCompanySettingsForPDF } from '@/lib/pdf/pdf-utils'
import { checkRateLimit } from '@/lib/security/rate-limiter'
import { getClientIp } from '@/lib/api-security'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting for expensive PDF generation
    const clientIp = getClientIp(request)
    const rateCheck = await checkRateLimit(clientIp, '/api/pdf/bkk')
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

    // Fetch BKK with relations
    const { data: bkk, error: bkkError } = await supabase
      .from('bukti_kas_keluar')
      .select(`
        *,
        job_orders(id, jo_number),
        requester:user_profiles!bukti_kas_keluar_requested_by_fkey(id, full_name),
        approver:user_profiles!bukti_kas_keluar_approved_by_fkey(id, full_name),
        releaser:user_profiles!bukti_kas_keluar_released_by_fkey(id, full_name),
        settler:user_profiles!bukti_kas_keluar_settled_by_fkey(id, full_name),
        cost_item:pjo_cost_items(id, category, description, estimated_amount)
      `)
      .eq('id', id)
      .single()

    if (bkkError || !bkk) {
      return new Response(JSON.stringify({ error: 'BKK not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch company settings
    const company = await getCompanySettingsForPDF()

    // Prepare data for PDF
    const pdfProps: BKKPDFProps = {
      bkk: {
        bkk_number: bkk.bkk_number,
        status: bkk.status || 'pending',
        purpose: bkk.purpose,
        amount_requested: bkk.amount_requested || 0,
        budget_category: bkk.budget_category ?? null,
        notes: bkk.notes ?? null,
        release_method: bkk.release_method ?? null,
        release_reference: bkk.release_reference ?? null,
        amount_spent: bkk.amount_spent ?? null,
        amount_returned: bkk.amount_returned ?? null,
        requested_at: bkk.requested_at || bkk.created_at || new Date().toISOString(),
        approved_at: bkk.approved_at ?? null,
        released_at: bkk.released_at ?? null,
        settled_at: bkk.settled_at ?? null,
      },
      jobOrder: {
        jo_number: bkk.job_orders?.jo_number || '-',
      },
      requester: bkk.requester?.full_name ? { full_name: bkk.requester.full_name } : null,
      approver: bkk.approver?.full_name ? { full_name: bkk.approver.full_name } : null,
      releaser: bkk.releaser?.full_name ? { full_name: bkk.releaser.full_name } : null,
      settler: bkk.settler?.full_name ? { full_name: bkk.settler.full_name } : null,
      costItem: bkk.cost_item
        ? {
            category: bkk.cost_item.category,
            description: bkk.cost_item.description,
            estimated_amount: bkk.cost_item.estimated_amount || 0,
          }
        : null,
      company,
    }

    // Generate PDF
    const buffer = await renderToBuffer(<BKKPDF {...pdfProps} />)

    // Set headers
    const filename = `${bkk.bkk_number}.pdf`
    const disposition = download ? `attachment; filename="${filename}"` : `inline; filename="${filename}"`

    return new Response(buffer as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to generate PDF' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
