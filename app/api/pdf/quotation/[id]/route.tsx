import { NextRequest } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { QuotationPDF } from '@/lib/pdf/quotation-pdf'
import { getCompanySettingsForPDF } from '@/lib/pdf/pdf-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const download = searchParams.get('download') === 'true'

    const supabase = await createClient()

    // Fetch quotation with relations
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .select(`
        *,
        customer:customers(id, name, email, phone, address),
        revenue_items:quotation_revenue_items(*),
        cost_items:quotation_cost_items(*)
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (quotationError || !quotation) {
      return new Response(JSON.stringify({ error: 'Quotation not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch company settings
    const company = await getCompanySettingsForPDF()

    // Sort revenue items by display_order
    const revenueItems = ((quotation as Record<string, unknown>).revenue_items as Array<Record<string, unknown>> || [])
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
        ((a.display_order as number) || 0) - ((b.display_order as number) || 0)
      )
      .map((item: Record<string, unknown>) => ({
        category: item.category as string,
        description: item.description as string,
        quantity: item.quantity as number | null,
        unit: item.unit as string | null,
        unit_price: (item.unit_price as number) || 0,
        subtotal: item.subtotal as number | null,
      }))

    // Sort cost items by display_order
    const costItems = ((quotation as Record<string, unknown>).cost_items as Array<Record<string, unknown>> || [])
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
        ((a.display_order as number) || 0) - ((b.display_order as number) || 0)
      )
      .map((item: Record<string, unknown>) => ({
        category: item.category as string,
        description: item.description as string,
        estimated_amount: (item.estimated_amount as number) || 0,
        vendor_name: item.vendor_name as string | null,
      }))

    const customerData = (quotation as Record<string, unknown>).customer as Record<string, string> | null

    // Prepare data for PDF
    const pdfProps = {
      quotation: {
        quotation_number: quotation.quotation_number,
        title: quotation.title,
        created_at: quotation.created_at || new Date().toISOString(),
        rfq_number: quotation.rfq_number,
        rfq_date: quotation.rfq_date,
        rfq_deadline: quotation.rfq_deadline,
        origin: quotation.origin,
        destination: quotation.destination,
        commodity: quotation.commodity,
        cargo_weight_kg: quotation.cargo_weight_kg,
        cargo_length_m: quotation.cargo_length_m,
        cargo_width_m: quotation.cargo_width_m,
        cargo_height_m: quotation.cargo_height_m,
        estimated_shipments: quotation.estimated_shipments,
        total_revenue: quotation.total_revenue,
        total_cost: quotation.total_cost,
        gross_profit: quotation.gross_profit,
        profit_margin: quotation.profit_margin,
        notes: quotation.notes,
        status: quotation.status,
      },
      customer: {
        name: customerData?.name || 'Unknown Customer',
        email: customerData?.email,
        phone: customerData?.phone,
        address: customerData?.address,
      },
      revenueItems,
      costItems,
      company,
    }

    // Generate PDF
    const buffer = await renderToBuffer(<QuotationPDF {...pdfProps} />)

    // Set headers
    const filename = `${quotation.quotation_number}.pdf`
    const disposition = download ? `attachment; filename="${filename}"` : `inline; filename="${filename}"`

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
      },
    })
  } catch (error) {
    console.error('Error generating quotation PDF:', error)
    return new Response(JSON.stringify({ error: 'Failed to generate PDF' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
