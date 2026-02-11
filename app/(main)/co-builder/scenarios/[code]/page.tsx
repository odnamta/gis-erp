import { getScenarioByCode } from '../../actions'
import { ScenarioDetailClient } from './scenario-detail-client'
import { notFound } from 'next/navigation'

export default async function ScenarioDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const scenario = await getScenarioByCode(code)
  if (!scenario) notFound()
  return <ScenarioDetailClient scenario={scenario} />
}
