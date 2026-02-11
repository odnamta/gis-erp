import { getAllCompetitionFeedback, getLeaderboard } from '../actions'
import { AdminClient } from './admin-client'

export default async function AdminPage() {
  const [feedback, leaderboard] = await Promise.all([
    getAllCompetitionFeedback(),
    getLeaderboard(),
  ])
  return <AdminClient feedback={feedback} leaderboard={leaderboard} />
}
