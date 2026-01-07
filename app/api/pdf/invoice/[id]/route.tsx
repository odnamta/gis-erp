import { NextRequest } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { InvoicePDF } from '@/lib/pdf/invoice-pdf'
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

    // Fetch invoice with relations
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        customers (id, name, email, address),
        job_orders (id, jo_number, pjo_id)
      `)
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch line items
    const { data: lineItems } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', id)
      .order('line_number', { ascending: true })

    // Fetch company settings
    const company = await getCompanySettingsForPDF()

    // Prepare data for PDF
    const pdfProps = {
      invoice: {
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date || invoice.created_at,
        due_date: invoice.due_date,
        subtotal: invoice.subtotal || 0,
        tax_amount: invoice.tax_amount || 0,
        total_amount: invoice.total_amount || 0,
        term_description: invoice.term_description,
        notes: invoice.notes,
      },
      customer: {
        name: invoice.customers?.name || 'Unknown Customer',
        address: invoice.customers?.address,
      },
      jobOrder: {
        jo_number: invoice.job_orders?.jo_number || '-',
      },
      lineItems: (lineItems || []).map(item => ({
        description: item.description,
        quantity: item.quantity || 1,
        unit: item.unit,
        unit_price: item.unit_price || 0,
        subtotal: item.subtotal || (item.quantity || 1) * (item.unit_price || 0),
      })),
      company,
    }

    // Generate PDF
    const buffer = await renderToBuffer(<InvoicePDF {...pdfProps as any} />)

    // Set headers
    const filename = `${invoice.invoice_number}.pdf`
    const disposition = download ? `attachment; filename="${filename}"` : `inline; filename="${filename}"`

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
      },
    })
  } catch (error) {
    console.error('Error generating invoice PDF:', error)
    return new Response(JSON.stringify({ error: 'Failed to generate PDF' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
