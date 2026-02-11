import { getFeedbackById } from '../../../actions'
import { AdminReviewClient } from './admin-review-client'
import { notFound } from 'next/navigation'

export default async function AdminReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const feedback = await getFeedbackById(id)
  if (!feedback) notFound()
  return <AdminReviewClient feedback={feedback} />
}
