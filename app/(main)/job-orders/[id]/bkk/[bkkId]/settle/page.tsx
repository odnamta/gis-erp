import { redirect } from 'next/navigation'
import { getBKKById } from '@/app/(main)/job-orders/bkk-actions'
import { BKKSettleForm } from '@/components/bkk/bkk-settle-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: Promise<{ id: string; bkkId: string }>
}

export default async function SettleBKKPage({ params }: PageProps) {
  const { id: jobOrderId, bkkId } = await params

  const bkk = await getBKKById(bkkId)

  if (!bkk) {
    redirect(`/job-orders/${jobOrderId}`)
  }

  // Only allow settling released BKKs
  if (bkk.status !== 'released') {
    redirect(`/job-orders/${jobOrderId}/bkk/${bkkId}`)
  }

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/job-orders/${jobOrderId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Settle Cash Disbursement</h1>
      </div>

      <BKKSettleForm bkk={bkk} jobOrderId={jobOrderId} />
    </div>
  )
}
