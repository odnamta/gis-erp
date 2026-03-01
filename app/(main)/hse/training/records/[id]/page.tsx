import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RecordForm } from '@/components/training/record-form';
import { TrainingRecordRow, transformRecordRow } from '@/types/training';
import { PDFButtons } from '@/components/pdf/pdf-buttons';

interface RecordDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RecordDetailPage({ params }: RecordDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: recordData, error } = await supabase
    .from('employee_training_records')
    .select(`
      *,
      employees(employee_code, full_name, departments(department_name)),
      safety_training_courses(course_code, course_name)
    `)
    .eq('id', id)
    .single();

  if (error || !recordData) {
    notFound();
  }

  const record = {
    ...transformRecordRow(recordData as TrainingRecordRow),
    employeeCode: recordData.employees?.employee_code,
    employeeName: recordData.employees?.full_name,
    departmentName: recordData.employees?.departments?.department_name,
    courseCode: recordData.safety_training_courses?.course_code,
    courseName: recordData.safety_training_courses?.course_name,
  };

  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_code, full_name')
    .eq('status', 'active')
    .order('full_name');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit Catatan Pelatihan</h1>
          <p className="text-muted-foreground">
            {record.employeeName} - {record.courseName}
          </p>
        </div>
        <PDFButtons
          documentType="training"
          documentId={id}
          documentNumber={record.certificateNumber || undefined}
          size="sm"
          variant="outline"
        />
      </div>

      <RecordForm record={record} employees={employees || []} />
    </div>
  );
}
