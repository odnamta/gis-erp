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
import { AlertTriangle } from 'lucide-react';
import { ExpiringCertification } from '@/types/skills';
import { expiryStatusConfig, formatDaysUntilExpiry } from '@/lib/skills-utils';
import { format } from 'date-fns';

interface ExpiringCertificationsTabProps {
  certifications: ExpiringCertification[];
  isLoading: boolean;
}

export function ExpiringCertificationsTab({
  certifications,
  isLoading,
}: ExpiringCertificationsTabProps) {
  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  const expiredCount = certifications.filter(c => c.expiry_status === 'expired').length;
  const criticalCount = certifications.filter(c => c.expiry_status === 'critical').length;
  const warningCount = certifications.filter(c => c.expiry_status === 'warning').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Expiring Certifications (Next 60 days)
          </CardTitle>
          <div className="flex gap-2">
            {expiredCount > 0 && (
              <Badge variant="destructive">{expiredCount} expired</Badge>
            )}
            {criticalCount > 0 && (
              <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                {criticalCount} critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                {warningCount} warning
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {certifications.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No certifications expiring in the next 60 days. 🎉
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Skill</TableHead>
                <TableHead>Cert #</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {certifications.map((cert) => {
                const statusConfig = expiryStatusConfig[cert.expiry_status];

                return (
                  <TableRow key={cert.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{cert.employee_name}</p>
                        <p className="text-xs text-muted-foreground">{cert.employee_code}</p>
                      </div>
                    </TableCell>
                    <TableCell>{cert.skill_name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {cert.certification_number || '-'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(cert.expiry_date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusConfig.bgColor} ${statusConfig.color} hover:${statusConfig.bgColor}`}>
                        {statusConfig.icon} {formatDaysUntilExpiry(cert.days_until_expiry)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
