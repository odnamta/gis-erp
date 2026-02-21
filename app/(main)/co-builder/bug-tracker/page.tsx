import { getAllCompetitionFeedback } from '../actions'
import { BugTrackerClient } from './bug-tracker-client'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function BugTrackerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const feedback = await getAllCompetitionFeedback()
  return <BugTrackerClient feedback={feedback} />
}
