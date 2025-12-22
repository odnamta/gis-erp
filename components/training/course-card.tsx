'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrainingCourse } from '@/types/training';
import { TrainingTypeBadge } from './training-type-badge';
import { Clock, Calendar, Users, CheckCircle, XCircle, Eye } from 'lucide-react';
import Link from 'next/link';

interface CourseCardProps {
  course: TrainingCourse;
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Card className={!course.isActive ? 'opacity-60' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{course.courseName}</CardTitle>
            <p className="text-sm text-muted-foreground">{course.courseCode}</p>
          </div>
          <div className="flex gap-2">
            <TrainingTypeBadge type={course.trainingType} />
            {course.isMandatory && (
              <Badge variant="destructive">Wajib</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {course.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {course.description}
          </p>
        )}
        
        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          {course.durationHours && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{course.durationHours} jam</span>
            </div>
          )}
          {course.validityMonths ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{course.validityMonths} bulan</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Tidak kadaluarsa</span>
            </div>
          )}
          {course.requiresAssessment && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              <span>Nilai lulus: {course.passingScore}%</span>
            </div>
          )}
          {!course.internalTraining && course.externalProvider && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="truncate">{course.externalProvider}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {course.isActive ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Aktif
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-500 border-gray-500">
                <XCircle className="h-3 w-3 mr-1" />
                Nonaktif
              </Badge>
            )}
          </div>
          <Link href={`/hse/training/courses/${course.id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              Detail
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
