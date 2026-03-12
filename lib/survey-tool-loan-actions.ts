'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/permissions-server';
import { getCurrentProfileId } from '@/lib/auth-helpers';
import { revalidatePath } from 'next/cache';
import {
  SurveyToolLoan,
  CreateLoanInput,
  LoanFilters,
} from '@/types/survey-tool-loan';

async function generateLoanNumber(): Promise<string> {
  const supabase = await createClient();
  const year = new Date().getFullYear();
  const prefix = `STL-${year}-`;

  const { data } = await supabase
    .from('survey_tool_loans' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('loan_number')
    .like('loan_number', `${prefix}%`)
    .order('loan_number', { ascending: false })
    .limit(1);

  let sequence = 1;
  if (data && data.length > 0) {
    const lastNum = (data[0] as any).loan_number as string; // eslint-disable-line @typescript-eslint/no-explicit-any
    const lastSeq = parseInt(lastNum.split('-').pop() || '0', 10);
    sequence = lastSeq + 1;
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

export async function getSurveyToolLoans(
  filters?: LoanFilters
): Promise<SurveyToolLoan[]> {
  const supabase = await createClient();

  let query = supabase
    .from('survey_tool_loans' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  // Fetch borrower names
  const borrowerIds = [...new Set((data as any[]).map((d: any) => d.borrower_id))]; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .in('id', borrowerIds);

  const profileMap = new Map<string, any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  (profiles || []).forEach((p: any) => profileMap.set(p.id, p)); // eslint-disable-line @typescript-eslint/no-explicit-any

  let result = (data as any[]).map((loan: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    ...loan,
    borrower: profileMap.get(loan.borrower_id) || null,
  })) as SurveyToolLoan[];

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(
      (r) =>
        r.loan_number.toLowerCase().includes(s) ||
        r.tool_name.toLowerCase().includes(s) ||
        r.borrower?.full_name?.toLowerCase().includes(s)
    );
  }

  return result;
}

export async function getSurveyToolLoanById(id: string): Promise<SurveyToolLoan | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('survey_tool_loans' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  const loan = data as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  // Fetch borrower
  const { data: borrower } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .eq('id', loan.borrower_id)
    .single();

  // Fetch JO if linked
  let job_order = null;
  if (loan.jo_id) {
    const { data: jo } = await supabase
      .from('job_orders')
      .select('id, jo_number')
      .eq('id', loan.jo_id)
      .single();
    job_order = jo;
  }

  // Fetch issuer
  let issuer = null;
  if (loan.issued_by) {
    const { data: u } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('id', loan.issued_by)
      .single();
    issuer = u;
  }

  // Fetch receiver
  let receiver = null;
  if (loan.returned_to) {
    const { data: u } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('id', loan.returned_to)
      .single();
    receiver = u;
  }

  return {
    ...loan,
    borrower,
    job_order,
    issuer,
    receiver,
  } as SurveyToolLoan;
}

export async function createSurveyToolLoan(
  input: CreateLoanInput
): Promise<{ success: boolean; data?: SurveyToolLoan; error?: string }> {
  const profile = await getUserProfile();
  if (!profile) return { success: false, error: 'Tidak terautentikasi' };

  if (!input.tool_name?.trim()) return { success: false, error: 'Nama alat harus diisi' };
  if (!input.borrower_id) return { success: false, error: 'Peminjam harus dipilih' };
  if (!input.loan_date) return { success: false, error: 'Tanggal pinjam harus diisi' };

  const supabase = await createClient();
  const profileId = await getCurrentProfileId();
  const loanNumber = await generateLoanNumber();

  const { data, error } = await supabase
    .from('survey_tool_loans' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .insert({
      loan_number: loanNumber,
      tool_name: input.tool_name,
      tool_serial_number: input.tool_serial_number || null,
      borrower_id: input.borrower_id,
      jo_id: input.jo_id || null,
      loan_date: input.loan_date,
      expected_return_date: input.expected_return_date || null,
      loan_condition: input.loan_condition || 'good',
      notes: input.notes || null,
      status: 'borrowed',
      issued_by: profileId,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: 'Gagal mencatat peminjaman alat' };
  }

  revalidatePath('/engineering/survey-tools');
  return { success: true, data: data as unknown as SurveyToolLoan };
}

export async function returnSurveyTool(
  id: string,
  returnCondition: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!profile) return { success: false, error: 'Tidak terautentikasi' };

  const supabase = await createClient();
  const profileId = await getCurrentProfileId();

  const { data: loan } = await supabase
    .from('survey_tool_loans' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('id', id)
    .single();

  if (!loan || !['borrowed', 'overdue'].includes((loan as any).status)) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { success: false, error: 'Alat tidak dalam status dipinjam' };
  }

  const { error } = await supabase
    .from('survey_tool_loans' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update({
      status: 'returned',
      actual_return_date: new Date().toISOString().split('T')[0],
      return_condition: returnCondition || 'good',
      returned_to: profileId,
    })
    .eq('id', id);

  if (error) {
    return { success: false, error: 'Gagal mencatat pengembalian' };
  }

  revalidatePath('/engineering/survey-tools');
  revalidatePath(`/engineering/survey-tools/${id}`);
  return { success: true };
}

export async function markToolLost(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!profile) return { success: false, error: 'Tidak terautentikasi' };

  const supabase = await createClient();

  const { data: loan } = await supabase
    .from('survey_tool_loans' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('id', id)
    .single();

  if (!loan || !['borrowed', 'overdue'].includes((loan as any).status)) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { success: false, error: 'Alat tidak dalam status dipinjam' };
  }

  const { error } = await supabase
    .from('survey_tool_loans' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update({ status: 'lost' })
    .eq('id', id);

  if (error) {
    return { success: false, error: 'Gagal menandai alat hilang' };
  }

  revalidatePath('/engineering/survey-tools');
  revalidatePath(`/engineering/survey-tools/${id}`);
  return { success: true };
}

export async function getSurveyToolLoanStats(): Promise<{
  total: number;
  borrowed: number;
  returned: number;
  overdue: number;
}> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('survey_tool_loans' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('is_active', true);

  const all = (data || []) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    total: all.length,
    borrowed: all.filter((r) => r.status === 'borrowed' || r.status === 'overdue').length,
    returned: all.filter((r) => r.status === 'returned').length,
    overdue: all.filter((r) => r.status === 'overdue').length,
  };
}
