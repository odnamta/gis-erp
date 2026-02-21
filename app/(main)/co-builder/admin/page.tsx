import { getAllCompetitionFeedback, getLeaderboard } from '../actions'
import { AdminClient } from './admin-client'
import { getUserProfile } from '@/lib/permissions-server'
import { notFound } from 'next/navigation'

const ADMIN_ROLES = ['owner', 'director', 'sysadmin']

export default async function AdminPage() {
  const profile = await getUserProfile()
  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    notFound()
  }

  const [feedback, leaderboard] = await Promise.all([
    getAllCompetitionFeedback(),
    getLeaderboard(),
  ])
  return <AdminClient feedback={feedback} leaderboard={leaderboard} />
}
