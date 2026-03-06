import { notFound } from 'next/navigation'
import { getJobOrder } from '../actions'
import { JODetailView } from '@/components/job-orders/jo-detail-view'
import { getUserProfile } from '@/lib/permissions-server'

interface JobOrderDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function JobOrderDetailPage({ params }: JobOrderDetailPageProps) {
  const { id } = await params
  const [jobOrder, profile] = await Promise.all([
    getJobOrder(id),
    getUserProfile(),
  ])

  if (!jobOrder) {
    notFound()
  }

  // Strip revenue/profit data from ops users to prevent client-side data leak
  const isOps = profile?.role === 'ops'
  const safeJobOrder = isOps ? {
    ...jobOrder,
    final_revenue: 0,
    total_revenue: 0,
    final_cost: null as number | null,
    profit: null as number | null,
    margin: null as number | null,
    profit_margin: null as number | null,
    total_revenue_calculated: 0,
  } : jobOrder

  return <JODetailView jobOrder={safeJobOrder} userRole={profile?.role} />
}
