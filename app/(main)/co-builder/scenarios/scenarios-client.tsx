'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Play,
  Trophy,
} from 'lucide-react'
import type { TestScenario } from '../actions'

export function ScenariosClient({ scenarios }: { scenarios: TestScenario[] }) {
  const completed = scenarios.filter(s => s.is_completed).length
  const total = scenarios.length
  const progress = total > 0 ? (completed / total) * 100 : 0

  // Group by week
  const byWeek = scenarios.reduce<Record<number, TestScenario[]>>((acc, s) => {
    if (!acc[s.week_number]) acc[s.week_number] = []
    acc[s.week_number].push(s)
    return acc
  }, {})

  const weekLabels: Record<number, string> = {
    1: 'Minggu 1 (12-18 Feb)',
    2: 'Minggu 2 (19-25 Feb)',
    3: 'Minggu 3 (26 Feb - 4 Mar)',
    4: 'Minggu 4 (5-12 Mar)',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/co-builder"><ArrowLeft className="mr-2 h-4 w-4" />Kembali</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Test Scenarios</h1>
          <p className="text-sm text-muted-foreground">
            Ikuti skenario untuk mendapatkan 20 poin per skenario
          </p>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress Skenario</span>
            <span className="text-sm text-muted-foreground">{completed}/{total} selesai</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="mt-2 text-xs text-muted-foreground">
            Selesaikan semua skenario untuk mendapatkan {total * 20} poin total
          </p>
        </CardContent>
      </Card>

      {/* Scenarios by Week */}
      {Object.entries(byWeek)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([week, weekScenarios]) => (
          <div key={week} className="space-y-3">
            <h2 className="text-lg font-semibold">
              {weekLabels[Number(week)] || `Minggu ${week}`}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {weekScenarios.map((scenario) => (
                <Card
                  key={scenario.id}
                  className={scenario.is_completed ? 'border-green-200 bg-green-50/50' : ''}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-mono">
                          {scenario.scenario_code}
                        </Badge>
                        {scenario.is_completed && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        <Trophy className="mr-1 h-3 w-3" />
                        {scenario.points_value} pts
                      </Badge>
                    </div>
                    <CardTitle className="text-base mt-2">{scenario.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {scenario.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          ~{scenario.estimated_minutes} menit
                        </span>
                        <span>{scenario.steps?.length || 0} langkah</span>
                      </div>
                      {scenario.is_completed ? (
                        <Badge className="bg-green-100 text-green-700">Selesai</Badge>
                      ) : (
                        <Button size="sm" asChild>
                          <Link href={`/co-builder/scenarios/${scenario.scenario_code}`}>
                            <Play className="mr-1 h-3 w-3" />
                            Mulai
                          </Link>
                        </Button>
                      )}
                    </div>
                    {/* Target roles */}
                    {scenario.target_roles && scenario.target_roles.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {scenario.target_roles.map((role) => (
                          <Badge key={role} variant="outline" className="text-[10px] px-1.5 py-0">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}
