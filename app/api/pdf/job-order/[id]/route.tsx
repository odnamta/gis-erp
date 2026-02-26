import { NextRequest } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { JobOrderPDF, JobOrderPDFProps } from '@/lib/pdf/job-order-pdf'
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
    const rateCheck = await checkRateLimit(clientIp, '/api/pdf/job-order')
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

    // Fetch job order with relations
    const { data: jobOrder, error: joError } = await supabase
      .from('job_orders')
      .select('*, projects(id, name), customers(id, name)')
      .eq('id', id)
      .single()

    if (joError || !jobOrder) {
      return new Response(JSON.stringify({ error: 'Job Order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch PJO details if linked
    let pjoData = null
    if (jobOrder.pjo_id) {
      const { data: pjo } = await supabase
        .from('proforma_job_orders')
        .select('pjo_number, commodity, quantity, quantity_unit, pol, pod, etd, eta, carrier_type')
        .eq('id', jobOrder.pjo_id)
        .single()
      pjoData = pjo
    }

    // Fetch revenue items from PJO
    let revenueItems: Array<{ description: string; quantity: number; unit_price: number; subtotal: number | null }> = []
    if (jobOrder.pjo_id) {
      const { data } = await supabase
        .from('pjo_revenue_items')
        .select('*')
        .eq('pjo_id', jobOrder.pjo_id)
        .order('created_at', { ascending: true })
      revenueItems = (data || []).map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      }))
    }

    // Fetch cost items from PJO
    let costItems: Array<{ category: string; description: string; estimated_amount: number; actual_amount: number | null }> = []
    if (jobOrder.pjo_id) {
      const { data } = await supabase
        .from('pjo_cost_items')
        .select('*')
        .eq('pjo_id', jobOrder.pjo_id)
        .order('created_at', { ascending: true })
      costItems = (data || []).map(item => ({
        category: item.category,
        description: item.description,
        estimated_amount: item.estimated_amount,
        actual_amount: item.actual_amount,
      }))
    }

    // Fetch company settings
    const company = await getCompanySettingsForPDF()

    // Prepare data for PDF
    const pdfProps: JobOrderPDFProps = {
      jobOrder: {
        jo_number: jobOrder.jo_number,
        status: jobOrder.status,
        description: jobOrder.description,
        final_revenue: jobOrder.final_revenue,
        final_cost: jobOrder.final_cost,
        completed_at: jobOrder.completed_at,
        created_at: jobOrder.created_at,
      },
      customer: {
        name: jobOrder.customers?.name || 'Unknown Customer',
      },
      project: {
        name: jobOrder.projects?.name || 'Unknown Project',
      },
      pjo: pjoData
        ? {
            pjo_number: pjoData.pjo_number,
            commodity: pjoData.commodity,
            quantity: pjoData.quantity,
            quantity_unit: pjoData.quantity_unit,
            pol: pjoData.pol,
            pod: pjoData.pod,
            etd: pjoData.etd,
            eta: pjoData.eta,
            carrier_type: pjoData.carrier_type,
          }
        : null,
      revenueItems,
      costItems,
      company,
    }

    // Generate PDF
    const buffer = await renderToBuffer(<JobOrderPDF {...pdfProps} />)

    // Set headers
    const filename = `${jobOrder.jo_number}.pdf`
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
