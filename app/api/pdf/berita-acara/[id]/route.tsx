import { NextRequest } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { BeritaAcaraPDF } from '@/lib/pdf/berita-acara-pdf'
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

    // Fetch berita acara with job order relation
    const { data: beritaAcara, error: baError } = await supabase
      .from('berita_acara')
      .select(`
        *,
        job_orders (
          id, 
          jo_number,
          customers (id, name)
        )
      `)
      .eq('id', id)
      .single()

    if (baError || !beritaAcara) {
      return new Response(JSON.stringify({ error: 'Berita Acara not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch company settings
    const company = await getCompanySettingsForPDF()

    // Parse photo_urls if it's a string
    let photoUrls: string[] = []
    if (beritaAcara.photo_urls) {
      if (typeof beritaAcara.photo_urls === 'string') {
        try {
          photoUrls = JSON.parse(beritaAcara.photo_urls)
        } catch {
          photoUrls = []
        }
      } else if (Array.isArray(beritaAcara.photo_urls)) {
        photoUrls = beritaAcara.photo_urls as string[]
      }
    }

    // Prepare data for PDF
    const pdfProps = {
      beritaAcara: {
        ba_number: beritaAcara.ba_number,
        handover_date: beritaAcara.handover_date,
        location: beritaAcara.location,
        work_description: beritaAcara.work_description,
        cargo_condition: beritaAcara.cargo_condition,
        condition_notes: beritaAcara.condition_notes,
        company_representative: beritaAcara.company_representative,
        client_representative: beritaAcara.client_representative,
        photo_urls: photoUrls,
        notes: beritaAcara.notes,
      },
      jobOrder: {
        jo_number: beritaAcara.job_orders?.jo_number || '-',
      },
      customer: {
        name: beritaAcara.job_orders?.customers?.name || 'Unknown Customer',
      },
      company,
    }

    // Generate PDF
    const buffer = await renderToBuffer(<BeritaAcaraPDF {...pdfProps as any} />)

    // Set headers
    const filename = `${beritaAcara.ba_number}.pdf`
    const disposition = download ? `attachment; filename="${filename}"` : `inline; filename="${filename}"`

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
      },
    })
  } catch (error) {
    console.error('Error generating Berita Acara PDF:', error)
    return new Response(JSON.stringify({ error: 'Failed to generate PDF' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
