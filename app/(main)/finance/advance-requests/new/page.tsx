'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createAdvanceRequest,
  getJobOrdersForAdvance,
  checkRecipientAdvanceEligibility,
} from '@/lib/advance-request-actions';
import type { AdvanceEligibility } from '@/lib/advance-guard';
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

export default function NewAdvanceRequestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [jobOrders, setJobOrders] = useState<
    { id: string; jo_number: string }[]
  >([]);

  // Eligibility state
  const [eligibility, setEligibility] = useState<AdvanceEligibility | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  const [form, setForm] = useState({
    recipient_name: '',
    amount: '',
    return_deadline: '',
    purpose: '',
    jo_id: '',
  });

  useEffect(() => {
    getJobOrdersForAdvance().then(setJobOrders);
  }, []);

  // Debounced eligibility check when recipient name changes
  const checkEligibility = useCallback(async (name: string) => {
    if (!name || name.trim().length < 2) {
      setEligibility(null);
      return;
    }
    setCheckingEligibility(true);
    try {
      const result = await checkRecipientAdvanceEligibility(name.trim());
      setEligibility(result);
    } catch {
      setEligibility(null);
    } finally {
      setCheckingEligibility(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkEligibility(form.recipient_name);
    }, 500);
    return () => clearTimeout(timer);
  }, [form.recipient_name, checkEligibility]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await createAdvanceRequest({
      recipient_name: form.recipient_name,
      amount: parseFloat(form.amount) || 0,
      return_deadline: form.return_deadline,
      purpose: form.purpose || undefined,
      jo_id: form.jo_id || undefined,
    });

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      router.push('/finance/advance-requests');
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/finance/advance-requests">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Buat Advance Baru</h1>
          <p className="text-muted-foreground">
            Isi formulir untuk mengajukan advance (uang muka)
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Detail Advance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Penerima Advance */}
            <div className="space-y-2">
              <Label htmlFor="recipient_name">Penerima Advance *</Label>
              <Input
                id="recipient_name"
                value={form.recipient_name}
                onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                placeholder="Nama penerima advance"
                required
              />
              {/* Eligibility indicator */}
              {checkingEligibility && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Memeriksa kelayakan...
                </p>
              )}
              {!checkingEligibility && eligibility && eligibility.eligible && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Penerima eligible untuk advance baru
                </p>
              )}
              {!checkingEligibility && eligibility && !eligibility.eligible && (
                <div className="p-3 text-sm text-red-800 bg-red-50 rounded-md border border-red-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Advance Diblokir</p>
                      <p className="mt-1">
                        Penerima memiliki {eligibility.overdueAdvances.length} advance
                        yang belum dikembalikan:
                      </p>
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        {eligibility.overdueAdvances.map((adv) => (
                          <li key={adv.bkk_number}>
                            {adv.bkk_number} — terlambat {adv.days_overdue} hari
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Jumlah & Deadline */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Jumlah Advance (Rp) *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0"
                  min="1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="return_deadline">Deadline Pengembalian *</Label>
                <Input
                  id="return_deadline"
                  type="date"
                  value={form.return_deadline}
                  onChange={(e) => setForm({ ...form, return_deadline: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Tujuan */}
            <div className="space-y-2">
              <Label htmlFor="purpose">Tujuan / Keterangan</Label>
              <Textarea
                id="purpose"
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="Jelaskan tujuan advance ini..."
                rows={3}
              />
            </div>

            {/* Job Order Reference */}
            <div className="space-y-2">
              <Label htmlFor="jo_id">Referensi Job Order (opsional)</Label>
              <Select
                value={form.jo_id}
                onValueChange={(v) => setForm({ ...form, jo_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Job Order..." />
                </SelectTrigger>
                <SelectContent>
                  {jobOrders.map((jo) => (
                    <SelectItem key={jo.id} value={jo.id}>
                      {jo.jo_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 text-sm text-red-800 bg-red-100 rounded-md">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={loading || (eligibility !== null && !eligibility.eligible)}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Buat Advance Request
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Batal
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
