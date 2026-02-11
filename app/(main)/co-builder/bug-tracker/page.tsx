import { getAllCompetitionFeedback } from '../actions'
import { BugTrackerClient } from './bug-tracker-client'

export default async function BugTrackerPage() {
  const feedback = await getAllCompetitionFeedback()
  return <BugTrackerClient feedback={feedback} />
}
