import { NextRequest } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { TrainingPDF, TrainingPDFProps } from '@/lib/pdf/training-pdf'
import { getCompanySettingsForPDF } from '@/lib/pdf/pdf-utils'
import { checkRateLimit } from '@/lib/security/rate-limiter'
import { getClientIp } from '@/lib/api-security'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clientIp = getClientIp(request)
    const rateCheck = await checkRateLimit(clientIp, '/api/pdf/training')
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

    // Fetch training record with relations
    const { data: record, error: recordError } = await supabase
      .from('employee_training_records')
      .select(`
        *,
        employees(id, employee_code, full_name, departments(department_name)),
        safety_training_courses(
          course_code, course_name, training_type,
          duration_hours, validity_months, requires_assessment, passing_score
        )
      `)
      .eq('id', id)
      .single()

    if (recordError || !record) {
      return new Response(JSON.stringify({ error: 'Training record not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const company = await getCompanySettingsForPDF()

    const course = record.safety_training_courses
    const employee = record.employees

    const pdfProps: TrainingPDFProps = {
      record: {
        id: record.id,
        training_date: record.training_date,
        completion_date: record.completion_date,
        training_location: record.training_location,
        trainer_name: record.trainer_name,
        training_provider: record.training_provider,
        status: record.status || 'scheduled',
        assessment_score: record.assessment_score,
        assessment_passed: record.assessment_passed,
        certificate_number: record.certificate_number,
        valid_from: record.valid_from,
        valid_to: record.valid_to,
        notes: record.notes,
      },
      employee: {
        full_name: employee?.full_name || 'Unknown',
        employee_code: employee?.employee_code || undefined,
        department_name: employee?.departments?.department_name || undefined,
      },
      course: {
        course_code: course?.course_code || '-',
        course_name: course?.course_name || '-',
        training_type: course?.training_type || 'specialized',
        duration_hours: course?.duration_hours,
        validity_months: course?.validity_months,
        requires_assessment: course?.requires_assessment || false,
        passing_score: course?.passing_score,
      },
      company,
    }

    const buffer = await renderToBuffer(<TrainingPDF {...pdfProps} />)

    const filename = `${record.certificate_number || `training-${id.slice(0, 8)}`}.pdf`
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
