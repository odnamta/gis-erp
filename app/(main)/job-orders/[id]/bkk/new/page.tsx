import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BKKForm } from '@/components/bkk/bkk-form'
import { generateBKKNumberAction, getCostItemsForBKK } from '@/app/(main)/job-orders/bkk-actions'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function NewBKKPage({ params }: PageProps) {
  const { id: jobOrderId } = await params
  const supabase = await createClient()

  // Get job order details
  const { data: jobOrder, error } = await supabase
    .from('job_orders')
    .select('id, jo_number, description')
    .eq('id', jobOrderId)
    .single()

  if (error || !jobOrder) {
    redirect('/job-orders')
  }

  // Get cost items for the dropdown
  const costItems = await getCostItemsForBKK(jobOrderId)

  // Generate BKK number
  const bkkNumber = await generateBKKNumberAction()

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/job-orders/${jobOrderId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">New Cash Disbursement Request</h1>
      </div>

      <BKKForm
        jobOrderId={jobOrderId}
        joNumber={jobOrder.jo_number}
        costItems={costItems}
        generatedBKKNumber={bkkNumber}
      />
    </div>
  )
}
