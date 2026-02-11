import { getTestScenarios } from '../actions'
import { ScenariosClient } from './scenarios-client'

export default async function ScenariosPage() {
  const scenarios = await getTestScenarios()
  return <ScenariosClient scenarios={scenarios} />
}
