import { createClient } from '@/lib/supabase/server';
import { RecordForm } from '@/components/training/record-form';

export default async function NewRecordPage() {
  const supabase = await createClient();

  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_code, full_name')
    .eq('status', 'active')
    .order('full_name');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tambah Catatan Pelatihan</h1>
        <p className="text-muted-foreground">
          Catat pelatihan karyawan baru
        </p>
      </div>

      <RecordForm employees={employees || []} />
    </div>
  );
}
