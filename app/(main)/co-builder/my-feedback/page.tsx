import { createClient } from '@/lib/supabase/server'
import { getMyFeedback } from '../actions'
import { MyFeedbackClient } from './my-feedback-client'

export default async function MyFeedbackPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const feedback = await getMyFeedback()
  return <MyFeedbackClient feedback={feedback} currentUserId={user?.id || ''} />
}
