import { getFeedbackById } from '../../../actions'
import { AdminReviewClient } from './admin-review-client'
import { getUserProfile } from '@/lib/permissions-server'
import { notFound } from 'next/navigation'

const ADMIN_ROLES = ['owner', 'director', 'sysadmin']

export default async function AdminReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getUserProfile()
  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    notFound()
  }

  const { id } = await params
  const feedback = await getFeedbackById(id)
  if (!feedback) notFound()
  return <AdminReviewClient feedback={feedback} />
}
