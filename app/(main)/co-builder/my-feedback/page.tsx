import { getMyFeedback } from '../actions'
import { MyFeedbackClient } from './my-feedback-client'

export default async function MyFeedbackPage() {
  const feedback = await getMyFeedback()
  return <MyFeedbackClient feedback={feedback} />
}
