import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PJODetailView } from '@/components/pjo/pjo-detail-view'
import { ArrowLeft } from 'lucide-react'
import { getUserRole, getUserId } from '@/lib/permissions'
import { UserProfile } from '@/types'

interface PJODetailPageProps {
  params: Promise<{ id: string }>
}

export default async function PJODetailPage({ params }: PJODetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Parallelize PJO fetch + auth check
  const [pjoResult, authResult] = await Promise.all([
    supabase
      .from('proforma_job_orders')
      .select(`
        *,
        projects (
          id,
          name,
          customers (
            id,
            name
          )
        )
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single(),
    supabase.auth.getUser(),
  ])

  const { data: pjo, error } = pjoResult
  if (error || !pjo) {
    notFound()
  }

  const user = authResult.data.user

  // Parallelize quotation fetch + profile fetch
  const [quotationResult, profileResult] = await Promise.all([
    pjo.quotation_id
      ? supabase.from('quotations').select('id, quotation_number, title').eq('id', pjo.quotation_id).single()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from('user_profiles').select('*').eq('user_id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  const quotation = quotationResult.data
  const profile = (profileResult.data as UserProfile | null)

  const userRole = getUserRole(profile)
  const userId = getUserId(profile)

  // Merge quotation data into PJO
  const pjoWithQuotation = {
    ...pjo,
    quotation,
  }

  // Strip revenue/profit data from ops users to prevent client-side data leak
  const isOps = userRole === 'ops'
  const safePjo = isOps ? {
    ...pjoWithQuotation,
    total_revenue: 0,
    total_revenue_calculated: 0,
    total_expenses: 0,
  } : pjoWithQuotation

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/proforma-jo">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <span className="text-muted-foreground">Back to PJO List</span>
      </div>

      <PJODetailView pjo={safePjo} userRole={userRole} userId={userId} />
    </div>
  )
}
