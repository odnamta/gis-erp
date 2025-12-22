'use client';

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ComplianceEntry, ComplianceStatus } from '@/types/training';
import { ComplianceStatusIcon } from './compliance-status-icon';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

interface ComplianceMatrixProps {
  entries: ComplianceEntry[];
}

interface EmployeeCompliance {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  courses: Record<string, ComplianceStatus>;
  compliancePercentage: number;
}

export function ComplianceMatrix({ entries }: ComplianceMatrixProps) {
  const { employees, courses } = useMemo(() => {
    // Get unique courses
    const courseMap = new Map<string, { id: string; code: string; name: string; isMandatory: boolean }>();
    entries.forEach((entry) => {
      if (!courseMap.has(entry.courseId)) {
        courseMap.set(entry.courseId, {
          id: entry.courseId,
          code: entry.courseCode,
          name: entry.courseName,
          isMandatory: entry.isMandatory,
        });
      }
    });
    const courses = Array.from(courseMap.values());

    // Group by employee
    const employeeMap = new Map<string, EmployeeCompliance>();
    entries.forEach((entry) => {
      if (!employeeMap.has(entry.employeeId)) {
        employeeMap.set(entry.employeeId, {
          employeeId: entry.employeeId,
          employeeCode: entry.employeeCode,
          employeeName: entry.employeeName,
          departmentName: entry.departmentName,
          courses: {},
          compliancePercentage: 0,
        });
      }
      const emp = employeeMap.get(entry.employeeId)!;
      emp.courses[entry.courseId] = entry.complianceStatus;
    });

    // Calculate compliance percentage for each employee
    employeeMap.forEach((emp) => {
      const totalCourses = courses.length;
      const compliantCourses = Object.values(emp.courses).filter(
        (status) => status === 'valid' || status === 'expiring_soon'
      ).length;
      emp.compliancePercentage = totalCourses > 0 ? (compliantCourses / totalCourses) * 100 : 0;
    });

    const employees = Array.from(employeeMap.values()).sort((a, b) =>
      a.employeeName.localeCompare(b.employeeName)
    );

    return { employees, courses };
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Tidak ada data kepatuhan</h3>
        <p className="text-muted-foreground">
          Data kepatuhan akan muncul setelah ada karyawan dan kursus pelatihan
        </p>
      </div>
    );
  }

  const getComplianceBadge = (percentage: number) => {
    if (percentage >= 100) {
      return <Badge className="bg-green-500">{percentage.toFixed(0)}%</Badge>;
    }
    if (percentage >= 80) {
      return <Badge className="bg-yellow-500">{percentage.toFixed(0)}%</Badge>;
    }
    return <Badge variant="destructive">{percentage.toFixed(0)}%</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm">
        <span className="font-medium">Legenda:</span>
        <div className="flex items-center gap-1">
          <ComplianceStatusIcon status="valid" showTooltip={false} />
          <span>Berlaku</span>
        </div>
        <div className="flex items-center gap-1">
          <ComplianceStatusIcon status="expiring_soon" showTooltip={false} />
          <span>Segera Kadaluarsa</span>
        </div>
        <div className="flex items-center gap-1">
          <ComplianceStatusIcon status="expired" showTooltip={false} />
          <span>Kadaluarsa</span>
        </div>
        <div className="flex items-center gap-1">
          <ComplianceStatusIcon status="not_trained" showTooltip={false} />
          <span>Belum Dilatih</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-10">Karyawan</TableHead>
              <TableHead>Departemen</TableHead>
              {courses.map((course) => (
                <TableHead key={course.id} className="text-center min-w-[100px]">
                  <div className="flex flex-col items-center">
                    <span className="text-xs">{course.code}</span>
                    {course.isMandatory && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        Wajib
                      </Badge>
                    )}
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-center">Kepatuhan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((emp) => (
              <TableRow key={emp.employeeId}>
                <TableCell className="sticky left-0 bg-background z-10">
                  <div>
                    <p className="font-medium">{emp.employeeName}</p>
                    <p className="text-xs text-muted-foreground">{emp.employeeCode}</p>
                  </div>
                </TableCell>
                <TableCell>{emp.departmentName}</TableCell>
                {courses.map((course) => (
                  <TableCell key={course.id} className="text-center">
                    <div className="flex justify-center">
                      <ComplianceStatusIcon
                        status={emp.courses[course.id] || 'not_trained'}
                      />
                    </div>
                  </TableCell>
                ))}
                <TableCell className="text-center">
                  {getComplianceBadge(emp.compliancePercentage)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
