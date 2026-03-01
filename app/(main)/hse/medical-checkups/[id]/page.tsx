import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MedicalCheckupForm } from '@/components/medical-checkup/medical-checkup-form';
import { getMedicalCheckup } from '@/lib/medical-checkup-actions';

interface MedicalCheckupDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MedicalCheckupDetailPage({ params }: MedicalCheckupDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const record = await getMedicalCheckup(id);

  if (!record) {
    notFound();
  }

  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_code, full_name')
    .eq('status', 'active')
    .order('full_name');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Medical Checkup</h1>
        <p className="text-muted-foreground">
          {record.employee_name} - {record.clinic_name}
        </p>
      </div>

      <MedicalCheckupForm record={record} employees={employees || []} />
    </div>
  );
}
