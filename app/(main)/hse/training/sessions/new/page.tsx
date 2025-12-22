import { createClient } from '@/lib/supabase/server';
import { SessionForm } from '@/components/training/session-form';

export default async function NewSessionPage() {
  const supabase = await createClient();

  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_code, full_name')
    .eq('status', 'active')
    .order('full_name');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Jadwalkan Sesi Pelatihan</h1>
        <p className="text-muted-foreground">
          Buat jadwal sesi pelatihan baru
        </p>
      </div>

      <SessionForm employees={employees || []} />
    </div>
  );
}
