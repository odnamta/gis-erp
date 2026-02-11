import { getUserCompetitionStats } from '../actions'
import { Top5Client } from './top5-client'

export default async function Top5Page() {
  const stats = await getUserCompetitionStats()
  return <Top5Client stats={stats} />
}
