'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Users, AlertTriangle, Target } from 'lucide-react';
import { SkillsStats } from '@/types/skills';

interface SkillsStatsCardsProps {
  stats: SkillsStats;
  isLoading: boolean;
}

export function SkillsStatsCards({ stats, isLoading }: SkillsStatsCardsProps) {
  const cards = [
    {
      title: 'Total Skills',
      value: stats.totalSkills,
      icon: Award,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Employees with Skills',
      value: stats.employeesWithSkills,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Expiring Certifications',
      value: stats.expiringCertifications,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      highlight: stats.expiringCertifications > 0,
    },
    {
      title: 'Skill Gaps',
      value: stats.skillGaps,
      icon: Target,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      highlight: stats.skillGaps > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className={card.highlight ? 'border-orange-200' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className={`text-2xl font-bold ${card.highlight ? card.color : ''}`}>
                    {card.value}
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-full ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
