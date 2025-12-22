'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrainingRecord } from '@/types/training';
import { TrainingStatusBadge } from './training-status-badge';
import { Calendar, User, MapPin, Award, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface RecordCardProps {
  record: TrainingRecord;
}

export function RecordCard({ record }: RecordCardProps) {
  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'd MMM yyyy', { locale: localeId });
  };

  const getDaysUntilExpiry = () => {
    if (!record.validTo) return null;
    const today = new Date();
    const validTo = new Date(record.validTo);
    const diffTime = validTo.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilExpiry = getDaysUntilExpiry();

  return (
    <Link href={`/hse/training/records/${record.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">{record.courseName}</CardTitle>
              <p className="text-sm text-muted-foreground">{record.courseCode}</p>
            </div>
            <TrainingStatusBadge status={record.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{record.employeeName}</span>
            {record.employeeCode && (
              <span className="text-muted-foreground">({record.employeeCode})</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Tanggal: {formatDate(record.trainingDate)}</span>
          </div>

          {record.trainingLocation && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{record.trainingLocation}</span>
            </div>
          )}

          {record.status === 'completed' && record.validTo && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Berlaku s/d: {formatDate(record.validTo)}</span>
              {daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry >= 0 && (
                <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-50">
                  {daysUntilExpiry} hari lagi
                </Badge>
              )}
              {daysUntilExpiry !== null && daysUntilExpiry < 0 && (
                <Badge variant="destructive">Kadaluarsa</Badge>
              )}
            </div>
          )}

          {record.assessmentScore !== undefined && (
            <div className="flex items-center gap-2 text-sm">
              <Award className="h-4 w-4 text-muted-foreground" />
              <span>Nilai: {record.assessmentScore}</span>
              {record.assessmentPassed !== undefined && (
                <Badge variant={record.assessmentPassed ? 'default' : 'destructive'}>
                  {record.assessmentPassed ? 'Lulus' : 'Tidak Lulus'}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
