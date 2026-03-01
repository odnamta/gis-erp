import { createClient } from '@/lib/supabase/server';
import { MedicalCheckupForm } from '@/components/medical-checkup/medical-checkup-form';

export default async function NewMedicalCheckupPage() {
  const supabase = await createClient();

  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_code, full_name')
    .eq('status', 'active')
    .order('full_name');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tambah Medical Checkup</h1>
        <p className="text-muted-foreground">
          Catat data pemeriksaan kesehatan karyawan baru
        </p>
      </div>

      <MedicalCheckupForm employees={employees || []} />
    </div>
  );
}
