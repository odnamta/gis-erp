'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Lightbulb } from 'lucide-react';
import { SkillGapAnalysis } from '@/types/skills';
import {
  criticalityConfig,
  getGapStatus,
  getCoverageBarWidth,
  getCoverageBarColor,
} from '@/lib/skills-utils';

interface GapAnalysisTabProps {
  gapAnalysis: SkillGapAnalysis[];
  recommendations: string[];
  isLoading: boolean;
}

export function GapAnalysisTab({
  gapAnalysis,
  recommendations,
  isLoading,
}: GapAnalysisTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[150px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Capability Coverage (Operations Department)</CardTitle>
        </CardHeader>
        <CardContent>
          {gapAnalysis.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No skills configured yet. Add skills in the Skills Library tab.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Skill</TableHead>
                  <TableHead className="text-center">Required</TableHead>
                  <TableHead className="text-center">Have</TableHead>
                  <TableHead>Coverage</TableHead>
                  <TableHead className="text-center">Target</TableHead>
                  <TableHead className="text-center">Gap</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gapAnalysis.map((gap) => {
                  const gapStatus = getGapStatus(gap);
                  const config = criticalityConfig[gap.criticality];
                  const coverage = gap.current_coverage_percent ?? 0;

                  return (
                    <TableRow key={gap.skill_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{gap.skill_name}</span>
                          <Badge variant="outline" className={`${config.color} ${config.bgColor} text-xs`}>
                            {config.label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{gap.ops_staff_count}</TableCell>
                      <TableCell className="text-center">{gap.staff_with_skill}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getCoverageBarColor(coverage, gap.target_coverage_percent)} transition-all`}
                              style={{ width: `${getCoverageBarWidth(coverage)}%` }}
                            />
                          </div>
                          <span className="text-sm w-12 text-right">{coverage}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{gap.target_coverage_percent}%</TableCell>
                      <TableCell className="text-center">
                        <span className={gapStatus.status === 'met' ? 'text-green-600' : gapStatus.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}>
                          {gapStatus.icon} {gapStatus.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
