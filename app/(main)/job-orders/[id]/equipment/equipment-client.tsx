'use client';

// =====================================================
// v0.45: Job Order Equipment Client Component
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react';
import {
  JobEquipmentSummaryCards,
  JobEquipmentList,
  JobEquipmentTotals,
  AddEquipmentDialog,
  CompleteUsageDialog,
} from '@/components/job-equipment';
import {
  getJobEquipmentUsage,
  getJobEquipmentSummary,
} from '@/lib/job-equipment-actions';
import { createClient } from '@/lib/supabase/client';
import { JobEquipmentUsage, JobEquipmentSummary } from '@/types/job-equipment';
import { toast } from 'sonner';

interface EquipmentClientProps {
  jobOrderId: string;
}

interface JobOrderInfo {
  joNumber: string;
  customerName: string;
  status: string;
}

export function EquipmentClient({ jobOrderId }: EquipmentClientProps) {
  const router = useRouter();
  const [jobOrder, setJobOrder] = useState<JobOrderInfo | null>(null);
  const [usages, setUsages] = useState<JobEquipmentUsage[]>([]);
  const [summary, setSummary] = useState<JobEquipmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedUsage, setSelectedUsage] = useState<JobEquipmentUsage | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Get job order details
      const { data: joData, error: joError } = await supabase
        .from('job_orders')
        .select(`
          jo_number,
          status,
          customers!inner (name)
        `)
        .eq('id', jobOrderId)
        .single();

      if (joError || !joData) {
        toast.error('Job order tidak ditemukan');
        router.push('/job-orders');
        return;
      }

      const customer = joData.customers as { name: string };
      setJobOrder({
        joNumber: joData.jo_number,
        customerName: customer.name,
        status: joData.status,
      });

      // Get equipment usage and summary
      const [usageResult, summaryResult] = await Promise.all([
        getJobEquipmentUsage(jobOrderId),
        getJobEquipmentSummary(jobOrderId),
      ]);

      if (usageResult.success && usageResult.data) {
        setUsages(usageResult.data);
      }

      if (summaryResult.success && summaryResult.data) {
        setSummary(summaryResult.data);
      }
    } catch (error) {
      console.error('Error loading equipment data:', error);
      toast.error('Gagal memuat data equipment');
    } finally {
      setLoading(false);
    }
  }, [jobOrderId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCompleteUsage = (usage: JobEquipmentUsage) => {
    setSelectedUsage(usage);
    setCompleteDialogOpen(true);
  };

  const handleSuccess = () => {
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!jobOrder) {
    return null;
  }

  const canAddEquipment = jobOrder.status === 'active' || jobOrder.status === 'in_progress';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/job-orders/${jobOrderId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Equipment - {jobOrder.joNumber}
          </h1>
          <p className="text-muted-foreground">{jobOrder.customerName}</p>
        </div>
        {canAddEquipment && (
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Equipment
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      {summary && <JobEquipmentSummaryCards summary={summary} />}

      {/* Equipment List */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Equipment ({usages.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <JobEquipmentList
            usages={usages}
            onComplete={handleCompleteUsage}
            onRefresh={loadData}
          />
        </CardContent>
      </Card>

      {/* Totals */}
      {usages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Biaya Equipment</CardTitle>
          </CardHeader>
          <CardContent>
            <JobEquipmentTotals usages={usages} />
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <AddEquipmentDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        jobOrderId={jobOrderId}
        onSuccess={handleSuccess}
      />

      <CompleteUsageDialog
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
        usage={selectedUsage}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
