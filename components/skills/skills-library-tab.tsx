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
import { BookOpen, ShieldCheck } from 'lucide-react';
import { Skill, SkillCategory } from '@/types/skills';
import { criticalityConfig } from '@/lib/skills-utils';

interface SkillsLibraryTabProps {
  skills: Skill[];
  categories: SkillCategory[];
  isLoading: boolean;
}

export function SkillsLibraryTab({
  skills,
  categories,
  isLoading,
}: SkillsLibraryTabProps) {
  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  // Group skills by category
  const skillsByCategory = skills.reduce((acc, skill) => {
    const categoryName = skill.category?.category_name || 'Uncategorized';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  // Sort categories by display order
  const sortedCategories = categories.sort((a, b) => a.display_order - b.display_order);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-purple-500" />
          Skills Library
        </CardTitle>
      </CardHeader>
      <CardContent>
        {skills.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No skills configured yet.
          </p>
        ) : (
          <div className="space-y-6">
            {sortedCategories.map((category) => {
              const categorySkills = skillsByCategory[category.category_name] || [];
              if (categorySkills.length === 0) return null;

              return (
                <div key={category.id}>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                    {category.category_name}
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Skill</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead className="text-center">Certification</TableHead>
                        <TableHead className="text-center">Validity</TableHead>
                        <TableHead className="text-center">Criticality</TableHead>
                        <TableHead className="text-center">Target Coverage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categorySkills.map((skill) => {
                        const config = criticalityConfig[skill.criticality];

                        return (
                          <TableRow key={skill.id}>
                            <TableCell className="font-medium">{skill.skill_name}</TableCell>
                            <TableCell className="font-mono text-sm">{skill.skill_code}</TableCell>
                            <TableCell className="text-center">
                              {skill.requires_certification ? (
                                <ShieldCheck className="h-4 w-4 text-green-600 mx-auto" />
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {skill.certification_validity_months
                                ? `${skill.certification_validity_months} months`
                                : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={`${config.color} ${config.bgColor}`}>
                                {config.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {skill.target_coverage_percent}%
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
