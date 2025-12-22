'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, LayoutDashboard, ClipboardList, Search, Calendar } from 'lucide-react';
import { AuditSummaryCards } from '@/components/hse/audits/audit-summary-cards';
import { UpcomingAuditsList } from '@/components/hse/audits/upcoming-audits-list';
import { CriticalFindingsList } from '@/components/hse/audits/critical-findings-list';
import { AuditList } from '@/components/hse/audits/audit-list';
import { FindingList } from '@/components/hse/audits/finding-list';
import { AuditScheduleView } from '@/components/hse/audits/audit-schedule-view';
import { getAuditDashboardData, getAudits, getFindings, getAuditSchedule } from '@/lib/audit-actions';
import { AuditDashboardMetrics, AuditScheduleItem, OpenFindingView, Audit, AuditFinding } from '@/types/audit';

export default function AuditsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  
  // Dashboard data
  const [metrics, setMetrics] = useState<AuditDashboardMetrics>({
    dueSoonCount: 0,
    openFindingsCount: 0,
    criticalFindingsCount: 0,
    averageScoreMTD: 0,
    overdueAuditsCount: 0,
  });
  const [upcomingAudits, setUpcomingAudits] = useState<AuditScheduleItem[]>([]);
  const [criticalFindings, setCriticalFindings] = useState<OpenFindingView[]>([]);
  
  // List data
  const [audits, setAudits] = useState<Audit[]>([]);
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [schedule, setSchedule] = useState<AuditScheduleItem[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'audits' && audits.length === 0) {
      loadAudits();
    } else if (activeTab === 'findings' && findings.length === 0) {
      loadFindings();
    } else if (activeTab === 'schedule' && schedule.length === 0) {
      loadSchedule();
    }
  }, [activeTab]);

  async function loadDashboardData() {
    setLoading(true);
    const { data, error } = await getAuditDashboardData();
    if (data && !error) {
      setMetrics(data.metrics);
      setUpcomingAudits(data.upcomingAudits);
      setCriticalFindings(data.criticalFindings);
    }
    setLoading(false);
  }

  async function loadAudits() {
    const { data } = await getAudits();
    setAudits(data);
  }

  async function loadFindings() {
    const { data } = await getFindings();
    setFindings(data);
  }

  async function loadSchedule() {
    const { data } = await getAuditSchedule();
    setSchedule(data);
  }

  function handleStartAudit(auditTypeId: string) {
    router.push(`/hse/audits/new?type=${auditTypeId}`);
  }

  function handleViewFinding(id: string) {
    router.push(`/hse/audits/findings/${id}`);
  }

  function handleMarkComplete(id: string) {
    // TODO: Open closure dialog
    console.log('Mark complete:', id);
  }

  function handleViewAudit(id: string) {
    router.push(`/hse/audits/${id}`);
  }

  function handleEditAudit(id: string) {
    router.push(`/hse/audits/${id}/edit`);
  }

  function handleScheduleAudit(auditTypeId: string, date: Date) {
    router.push(`/hse/audits/new?type=${auditTypeId}&date=${date.toISOString().split('T')[0]}`);
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Safety Audits & Inspections</h1>
        <Button onClick={() => router.push('/hse/audits/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Audit
        </Button>
      </div>

      <AuditSummaryCards metrics={metrics} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="audits" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Audits
          </TabsTrigger>
          <TabsTrigger value="findings" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Findings
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <UpcomingAuditsList
              audits={upcomingAudits}
              onStartAudit={handleStartAudit}
            />
            <CriticalFindingsList
              findings={criticalFindings}
              onViewFinding={handleViewFinding}
              onMarkComplete={handleMarkComplete}
            />
          </div>
        </TabsContent>

        <TabsContent value="audits">
          <AuditList
            audits={audits}
            onView={handleViewAudit}
            onEdit={handleEditAudit}
          />
        </TabsContent>

        <TabsContent value="findings">
          <FindingList
            findings={findings}
            onView={handleViewFinding}
            onClose={handleMarkComplete}
          />
        </TabsContent>

        <TabsContent value="schedule">
          <AuditScheduleView
            schedule={schedule}
            onScheduleAudit={handleScheduleAudit}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
