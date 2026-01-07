/**
 * Widget Data Fetchers
 * v0.34: Dashboard Widgets & Customization
 * 
 * Each widget has a dedicated data fetcher function that returns
 * data in the appropriate format for its widget type.
 */

import { createClient } from '@/lib/supabase/client';
import type {
  StatCardData,
  ChartData,
  ListData,
  TableData,
  ProgressData,
  WidgetData,
} from '@/types/widgets';

// =====================================================
// DATA FETCHER DISPATCHER
// =====================================================

type DataFetcher = (settings?: Record<string, unknown>) => Promise<WidgetData>;

const dataFetchers: Record<string, DataFetcher> = {
  // Finance widgets
  'fin_cash_position': getCashPosition,
  'fin_ar_summary': getARSummary,
  'fin_ap_summary': getAPSummary,
  'fin_ar_aging_chart': getARAging,
  'fin_revenue_trend': getRevenueTrend,
  'fin_pending_approvals': getPendingBKK,
  
  // Sales widgets
  'sales_pipeline_summary': getPipelineSummary,
  'sales_pipeline_funnel': getPipelineFunnel,
  'sales_quotation_list': getActiveQuotations,
  'sales_win_rate': getWinRate,
  
  // Engineering widgets
  'eng_workload': getEngWorkload,
  'eng_assessments_list': getPendingAssessments,
  
  // Operations widgets
  'ops_active_jobs': getActiveJobsCount,
  'ops_jobs_list': getOpsJobList,
  'ops_delivery_schedule': getDeliverySchedule,
  'ops_cost_tracker': getCostSummary,
  'ops_pending_actions': getPendingOpsActions,
  
  // HR widgets
  'hr_attendance_today': getAttendanceSummary,
  'hr_leave_requests': getPendingLeave,
  'hr_skills_gap': getSkillsGap,
  
  // Executive widgets
  'exec_company_health': getCompanyHealth,
  'exec_department_scores': getDeptScores,
  'exec_kpi_summary': getKPISummary,
};

/**
 * Fetch widget data by widget code
 */
export async function fetchWidgetData(
  widgetCode: string,
  settings?: Record<string, unknown>
): Promise<WidgetData> {
  const fetcher = dataFetchers[widgetCode];
  
  if (!fetcher) {
    throw new Error(`Unknown widget: ${widgetCode}`);
  }
  
  return fetcher(settings);
}

/**
 * Check if a data fetcher exists for a widget code
 */
export function hasDataFetcher(widgetCode: string): boolean {
  return widgetCode in dataFetchers;
}

// =====================================================
// FINANCE WIDGET DATA FETCHERS
// =====================================================

export async function getCashPosition(): Promise<StatCardData> {
  const supabase = createClient();
  
  // Get total from paid invoices (simplified - in real app would track actual cash)
  const { data: invoices } = await supabase
    .from('invoices')
    .select('total_amount')
    .eq('status', 'paid');
  
  const totalCash = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
  
  return {
    value: totalCash,
    label: 'Cash Position',
    color: totalCash > 0 ? 'success' : 'warning',
    icon: 'banknote',
  };
}

export async function getARSummary(): Promise<StatCardData> {
  const supabase = createClient();
  
  const { data: invoices } = await supabase
    .from('invoices')
    .select('total_amount')
    .in('status', ['sent', 'overdue']);
  
  const totalAR = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
  const count = invoices?.length || 0;
  
  return {
    value: totalAR,
    label: `${count} Outstanding Invoices`,
    color: count > 10 ? 'warning' : 'default',
    icon: 'receipt',
  };
}

export async function getAPSummary(): Promise<StatCardData> {
  const supabase = createClient();
  
  const { data: vendorInvoices } = await supabase
    .from('vendor_invoices')
    .select('total_amount')
    .in('status', ['pending', 'approved']);
  
  const totalAP = vendorInvoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
  const count = vendorInvoices?.length || 0;
  
  return {
    value: totalAP,
    label: `${count} Pending Payments`,
    color: count > 5 ? 'warning' : 'default',
    icon: 'credit-card',
  };
}

export async function getARAging(): Promise<ChartData> {
  const supabase = createClient();
  
  const { data: invoices } = await supabase
    .from('invoices')
    .select('total_amount, due_date, status')
    .in('status', ['sent', 'overdue']);
  
  const now = new Date();
  const aging = { current: 0, '30': 0, '60': 0, '90': 0, over90: 0 };
  
  invoices?.forEach(inv => {
    if (!inv.due_date) return;
    const dueDate = new Date(inv.due_date);
    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const amount = inv.total_amount || 0;
    
    if (daysOverdue <= 0) aging.current += amount;
    else if (daysOverdue <= 30) aging['30'] += amount;
    else if (daysOverdue <= 60) aging['60'] += amount;
    else if (daysOverdue <= 90) aging['90'] += amount;
    else aging.over90 += amount;
  });
  
  return {
    type: 'bar',
    labels: ['Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days'],
    datasets: [{
      label: 'AR Aging',
      data: [aging.current, aging['30'], aging['60'], aging['90'], aging.over90],
      color: '#3b82f6',
    }],
  };
}

export async function getRevenueTrend(): Promise<ChartData> {
  const supabase = createClient();
  
  // Get last 6 months of revenue
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const { data: invoices } = await supabase
    .from('invoices')
    .select('total_amount, created_at')
    .eq('status', 'paid')
    .gte('created_at', sixMonthsAgo.toISOString());
  
  // Group by month
  const monthlyRevenue: Record<string, number> = {};
  const months: string[] = [];
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months.push(date.toLocaleDateString('en-US', { month: 'short' }));
    monthlyRevenue[key] = 0;
  }
  
  invoices?.forEach(inv => {
    if (!inv.created_at) return;
    const date = new Date(inv.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (key in monthlyRevenue) {
      monthlyRevenue[key] += inv.total_amount || 0;
    }
  });
  
  return {
    type: 'line',
    labels: months,
    datasets: [{
      label: 'Revenue',
      data: Object.values(monthlyRevenue),
      color: '#10b981',
    }],
  };
}

export async function getPendingBKK(): Promise<ListData> {
  const supabase = createClient();
  
  const { data: bkks } = await supabase
    .from('bukti_kas_keluar')
    .select('id, purpose, amount_requested, created_at, status')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(10);
  
  return {
    items: (bkks || []).map(bkk => ({
      id: bkk.id,
      title: bkk.purpose || 'BKK Entry',
      subtitle: `Rp ${(bkk.amount_requested || 0).toLocaleString()}`,
      status: bkk.status || 'pending',
      href: `/finance/bkk/${bkk.id}`,
      timestamp: bkk.created_at || undefined,
    })),
    totalCount: bkks?.length || 0,
  };
}

// =====================================================
// SALES WIDGET DATA FETCHERS
// =====================================================

export async function getPipelineSummary(): Promise<StatCardData> {
  const supabase = createClient();
  
  const { data: quotations } = await supabase
    .from('quotations')
    .select('total_revenue')
    .in('status', ['draft', 'submitted', 'engineering_review']);
  
  const totalValue = quotations?.reduce((sum, q) => sum + (q.total_revenue || 0), 0) || 0;
  const count = quotations?.length || 0;
  
  return {
    value: totalValue,
    label: `${count} Active Quotations`,
    color: 'default',
    icon: 'trending-up',
  };
}

export async function getPipelineFunnel(): Promise<ChartData> {
  const supabase = createClient();
  
  const { data: quotations } = await supabase
    .from('quotations')
    .select('status, total_revenue');
  
  const stages: Record<string, number> = {
    draft: 0,
    engineering_review: 0,
    submitted: 0,
    won: 0,
    lost: 0,
  };
  
  quotations?.forEach(q => {
    if (q.status && q.status in stages) {
      stages[q.status] += q.total_revenue || 0;
    }
  });
  
  return {
    type: 'funnel',
    labels: ['Draft', 'Engineering Review', 'Submitted', 'Won', 'Lost'],
    datasets: [{
      label: 'Pipeline Value',
      data: [stages.draft, stages.engineering_review, stages.submitted, stages.won, stages.lost],
      color: '#6366f1',
    }],
  };
}

export async function getActiveQuotations(): Promise<ListData> {
  const supabase = createClient();
  
  const { data: quotations } = await supabase
    .from('quotations')
    .select('id, quotation_number, customer:customers(name), total_revenue, status, created_at')
    .in('status', ['draft', 'submitted', 'engineering_review'])
    .order('created_at', { ascending: false })
    .limit(10);
  
  return {
    items: (quotations || []).map(q => ({
      id: q.id,
      title: q.quotation_number || 'Quotation',
      subtitle: `${(q.customer as { name: string } | null)?.name || 'Unknown'} - Rp ${(q.total_revenue || 0).toLocaleString()}`,
      status: q.status || 'draft',
      href: `/quotations/${q.id}`,
      timestamp: q.created_at || undefined,
    })),
    totalCount: quotations?.length || 0,
  };
}

export async function getWinRate(): Promise<StatCardData> {
  const supabase = createClient();
  
  const { data: quotations } = await supabase
    .from('quotations')
    .select('status')
    .in('status', ['won', 'lost']);
  
  const won = quotations?.filter(q => q.status === 'won').length || 0;
  const total = quotations?.length || 0;
  const winRate = total > 0 ? Math.round((won / total) * 100) : 0;
  
  return {
    value: `${winRate}%`,
    label: `${won} of ${total} Won`,
    color: winRate >= 50 ? 'success' : winRate >= 30 ? 'warning' : 'danger',
    icon: 'trophy',
  };
}

// =====================================================
// ENGINEERING WIDGET DATA FETCHERS
// =====================================================

export async function getEngWorkload(): Promise<StatCardData> {
  const supabase = createClient();
  
  const { data: quotations } = await supabase
    .from('quotations')
    .select('id')
    .eq('status', 'engineering_review');
  
  const count = quotations?.length || 0;
  
  return {
    value: count,
    label: 'Pending Reviews',
    color: count > 5 ? 'warning' : 'default',
    icon: 'clipboard-list',
  };
}

export async function getPendingAssessments(): Promise<ListData> {
  const supabase = createClient();
  
  const { data: quotations } = await supabase
    .from('quotations')
    .select('id, quotation_number, customer:customers(name), complexity_score, created_at')
    .eq('status', 'engineering_review')
    .order('created_at', { ascending: true })
    .limit(10);
  
  return {
    items: (quotations || []).map(q => ({
      id: q.id,
      title: q.quotation_number || 'Quotation',
      subtitle: `${(q.customer as { name: string })?.name || 'Unknown'} - Complexity: ${q.complexity_score || 0}`,
      status: 'engineering_review',
      href: `/quotations/${q.id}`,
      timestamp: q.created_at || undefined,
    })),
    totalCount: quotations?.length || 0,
  };
}

// =====================================================
// OPERATIONS WIDGET DATA FETCHERS
// =====================================================

export async function getActiveJobsCount(): Promise<StatCardData> {
  const supabase = createClient();
  
  const { data: jobs } = await supabase
    .from('job_orders')
    .select('id')
    .eq('status', 'active');
  
  const count = jobs?.length || 0;
  
  return {
    value: count,
    label: 'Active Jobs',
    color: 'default',
    icon: 'briefcase',
  };
}

export async function getOpsJobList(): Promise<TableData> {
  const supabase = createClient();
  
  const { data: jobs } = await supabase
    .from('job_orders')
    .select(`
      id,
      jo_number,
      pjo:proforma_job_orders(pjo_number, project:projects(name, customer:customers(name))),
      final_revenue,
      final_cost,
      status,
      created_at
    `)
    .in('status', ['active', 'completed'])
    .order('created_at', { ascending: false })
    .limit(20);
  
  return {
    columns: [
      { key: 'jo_number', label: 'JO Number', sortable: true },
      { key: 'customer', label: 'Customer', sortable: true },
      { key: 'project', label: 'Project', sortable: true },
      { key: 'revenue', label: 'Revenue', sortable: true },
      { key: 'status', label: 'Status', sortable: true },
    ],
    rows: (jobs || []).map(job => {
      const pjo = job.pjo as { pjo_number: string; project: { name: string; customer: { name: string } } } | null;
      return {
        id: job.id,
        jo_number: job.jo_number,
        customer: pjo?.project?.customer?.name || 'Unknown',
        project: pjo?.project?.name || 'Unknown',
        revenue: job.final_revenue || 0,
        status: job.status,
      };
    }),
    totalCount: jobs?.length || 0,
  };
}

export async function getDeliverySchedule(): Promise<ListData> {
  const supabase = createClient();
  
  const { data: jobs } = await supabase
    .from('job_orders')
    .select(`
      id,
      jo_number,
      pjo:proforma_job_orders(project:projects(name)),
      created_at,
      status
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(10);
  
  return {
    items: (jobs || []).map(job => {
      const pjo = job.pjo as { project: { name: string } | null } | null;
      return {
        id: job.id,
        title: job.jo_number || 'Job Order',
        subtitle: pjo?.project?.name || 'Unknown Project',
        status: job.status,
        href: `/job-orders/${job.id}`,
        timestamp: job.created_at || undefined,
      };
    }),
    totalCount: jobs?.length || 0,
  };
}

export async function getCostSummary(): Promise<ProgressData> {
  const supabase = createClient();
  
  const { data: jobs } = await supabase
    .from('job_orders')
    .select('final_revenue, final_cost')
    .eq('status', 'active');
  
  const totalRevenue = jobs?.reduce((sum, j) => sum + (j.final_revenue || 0), 0) || 0;
  const totalCost = jobs?.reduce((sum, j) => sum + (j.final_cost || 0), 0) || 0;
  
  return {
    current: totalCost,
    target: totalRevenue,
    label: 'Budget Utilization',
    segments: [
      { label: 'Cost', value: totalCost, color: '#ef4444' },
      { label: 'Remaining', value: Math.max(0, totalRevenue - totalCost), color: '#22c55e' },
    ],
  };
}

export async function getPendingOpsActions(): Promise<ListData> {
  const supabase = createClient();
  
  // Get jobs needing attention (e.g., cost items pending confirmation)
  const { data: costItems } = await supabase
    .from('pjo_cost_items')
    .select(`
      id,
      category,
      estimated_amount,
      pjo:proforma_job_orders(pjo_number)
    `)
    .eq('status', 'estimated')
    .limit(10);
  
  return {
    items: (costItems || []).map(item => {
      const pjo = item.pjo as { pjo_number: string } | null;
      return {
        id: item.id,
        title: `Confirm ${item.category}`,
        subtitle: `${pjo?.pjo_number || 'PJO'} - Rp ${(item.estimated_amount || 0).toLocaleString()}`,
        status: 'pending',
        href: `/pjo/${item.id}`,
      };
    }),
    totalCount: costItems?.length || 0,
  };
}

// =====================================================
// HR WIDGET DATA FETCHERS
// =====================================================

export async function getAttendanceSummary(): Promise<StatCardData> {
  const supabase = createClient();
  
  const today = new Date().toISOString().split('T')[0];
  
  const { data: attendance } = await supabase
    .from('attendance_records')
    .select('id')
    .eq('attendance_date', today)
    .eq('status', 'present');
  
  const { data: employees } = await supabase
    .from('employees')
    .select('id')
    .eq('status', 'active');
  
  const present = attendance?.length || 0;
  const total = employees?.length || 0;
  
  return {
    value: `${present}/${total}`,
    label: 'Present Today',
    color: present === total ? 'success' : 'warning',
    icon: 'users',
  };
}

export async function getPendingLeave(): Promise<ListData> {
  const supabase = createClient();
  
  const { data: leaves } = await supabase
    .from('leave_requests')
    .select(`
      id,
      employee_id,
      leave_type_id,
      start_date,
      end_date,
      status
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(10);
  
  // Fetch employee names separately to avoid ambiguous relation
  const employeeIds = leaves?.map(l => l.employee_id).filter(Boolean) || [];
  const { data: employees } = employeeIds.length > 0 
    ? await supabase.from('employees').select('id, full_name').in('id', employeeIds)
    : { data: [] };
  
  const employeeMap = new Map((employees || []).map(e => [e.id, e.full_name]));
  
  return {
    items: (leaves || []).map(leave => {
      return {
        id: leave.id,
        title: employeeMap.get(leave.employee_id) || 'Employee',
        subtitle: `Leave - ${leave.start_date} to ${leave.end_date}`,
        status: leave.status || 'pending',
        href: `/hr/leave/${leave.id}`,
      };
    }),
    totalCount: leaves?.length || 0,
  };
}

export async function getSkillsGap(): Promise<ChartData> {
  const supabase = createClient();
  
  const { data: skills } = await supabase
    .from('employee_skills')
    .select('skill:skills(skill_name), level');
  
  // Group by skill and calculate average proficiency
  const skillAverages: Record<string, { total: number; count: number }> = {};
  
  skills?.forEach(s => {
    const skillData = s.skill as { skill_name: string } | null;
    const skillName = skillData?.skill_name;
    if (!skillName) return;
    
    if (!skillAverages[skillName]) {
      skillAverages[skillName] = { total: 0, count: 0 };
    }
    // Convert level to numeric (beginner=1, intermediate=2, advanced=3, expert=4)
    const levelMap: Record<string, number> = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
    const levelValue = levelMap[s.level || 'beginner'] || 1;
    skillAverages[skillName].total += levelValue;
    skillAverages[skillName].count += 1;
  });
  
  const topSkills = Object.entries(skillAverages)
    .map(([name, data]) => ({
      name,
      average: data.count > 0 ? data.total / data.count : 0,
    }))
    .sort((a, b) => b.average - a.average)
    .slice(0, 6);
  
  return {
    type: 'bar',
    labels: topSkills.map(s => s.name),
    datasets: [{
      label: 'Average Proficiency',
      data: topSkills.map(s => Math.round(s.average * 10) / 10),
      color: '#8b5cf6',
    }],
  };
}

// =====================================================
// EXECUTIVE WIDGET DATA FETCHERS
// =====================================================

export async function getCompanyHealth(): Promise<StatCardData> {
  const supabase = createClient();
  
  // Calculate a simple health score based on various metrics
  const { data: invoices } = await supabase
    .from('invoices')
    .select('status');
  
  const { data: jobs } = await supabase
    .from('job_orders')
    .select('status');
  
  const paidInvoices = invoices?.filter(i => i.status === 'paid').length || 0;
  const totalInvoices = invoices?.length || 1;
  const activeJobs = jobs?.filter(j => j.status === 'active').length || 0;
  
  // Simple health calculation
  const paymentRate = (paidInvoices / totalInvoices) * 100;
  const healthScore = Math.round((paymentRate + (activeJobs > 0 ? 50 : 0)) / 2);
  
  return {
    value: `${healthScore}%`,
    label: 'Company Health Score',
    color: healthScore >= 70 ? 'success' : healthScore >= 50 ? 'warning' : 'danger',
    icon: 'heart-pulse',
  };
}

export async function getDeptScores(): Promise<ChartData> {
  // Simplified department scores
  return {
    type: 'bar',
    labels: ['Sales', 'Operations', 'Finance', 'Engineering', 'HR'],
    datasets: [{
      label: 'Performance Score',
      data: [85, 78, 92, 88, 75],
      color: '#06b6d4',
    }],
  };
}

export async function getKPISummary(): Promise<TableData> {
  const supabase = createClient();
  
  // Get various KPIs
  const { data: quotations } = await supabase
    .from('quotations')
    .select('status');
  
  const { data: jobs } = await supabase
    .from('job_orders')
    .select('status');
  
  const { data: invoices } = await supabase
    .from('invoices')
    .select('status, total_amount');
  
  const wonQuotations = quotations?.filter(q => q.status === 'won').length || 0;
  const totalQuotations = quotations?.length || 1;
  const activeJobs = jobs?.filter(j => j.status === 'active').length || 0;
  const completedJobs = jobs?.filter(j => j.status === 'completed').length || 0;
  const paidInvoices = invoices?.filter(i => i.status === 'paid').length || 0;
  const totalRevenue = invoices?.filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0;
  
  return {
    columns: [
      { key: 'kpi', label: 'KPI', sortable: false },
      { key: 'value', label: 'Value', sortable: true },
      { key: 'target', label: 'Target', sortable: false },
      { key: 'status', label: 'Status', sortable: false },
    ],
    rows: [
      { kpi: 'Win Rate', value: `${Math.round((wonQuotations / totalQuotations) * 100)}%`, target: '50%', status: wonQuotations / totalQuotations >= 0.5 ? 'on-track' : 'behind' },
      { kpi: 'Active Jobs', value: activeJobs, target: '10+', status: activeJobs >= 10 ? 'on-track' : 'behind' },
      { kpi: 'Completed Jobs', value: completedJobs, target: '20+', status: completedJobs >= 20 ? 'on-track' : 'behind' },
      { kpi: 'Collection Rate', value: `${Math.round((paidInvoices / (invoices?.length || 1)) * 100)}%`, target: '80%', status: paidInvoices / (invoices?.length || 1) >= 0.8 ? 'on-track' : 'behind' },
      { kpi: 'Total Revenue', value: `Rp ${totalRevenue.toLocaleString()}`, target: '-', status: 'info' },
    ],
    totalCount: 5,
  };
}
