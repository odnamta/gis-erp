'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComplianceSummaryCards } from '@/components/training/compliance-summary-cards';
import { ComplianceMatrix } from '@/components/training/compliance-matrix';
import { ExpiringTrainingList } from '@/components/training/expiring-training-list';
import { SessionList } from '@/components/training/session-list';
import {
  TrainingStatistics,
  ComplianceEntry,
  ExpiringTraining,
  TrainingSession,
} from '@/types/training';
import { GraduationCap, CalendarDays, FileText, BookOpen, Plus } from 'lucide-react';

interface TrainingDashboardClientProps {
  statistics: TrainingStatistics;
  complianceEntries: ComplianceEntry[];
  expiringTraining: ExpiringTraining[];
  upcomingSessions: TrainingSession[];
}

export function TrainingDashboardClient({
  statistics,
  complianceEntries,
  expiringTraining,
  upcomingSessions,
}: TrainingDashboardClientProps) {
  const [activeTab, setActiveTab] = useState('compliance');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-7 w-7" />
            Pelatihan Keselamatan
          </h1>
          <p className="text-muted-foreground">
            Kelola pelatihan dan kepatuhan karyawan
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/hse/training/sessions/new">
            <Button variant="outline">
              <CalendarDays className="mr-2 h-4 w-4" />
              Jadwalkan Sesi
            </Button>
          </Link>
          <Link href="/hse/training/records/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Catat Pelatihan
            </Button>
          </Link>
        </div>
      </div>

      <ComplianceSummaryCards statistics={statistics} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Matriks Kepatuhan
          </TabsTrigger>
          <TabsTrigger value="expiring" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Akan Kadaluarsa
            {expiringTraining.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                {expiringTraining.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Jadwal Pelatihan
          </TabsTrigger>
          <TabsTrigger value="courses" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Kursus
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compliance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Matriks Kepatuhan Pelatihan</CardTitle>
            </CardHeader>
            <CardContent>
              <ComplianceMatrix entries={complianceEntries} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiring" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pelatihan yang Akan Kadaluarsa (60 Hari)</CardTitle>
            </CardHeader>
            <CardContent>
              <ExpiringTrainingList items={expiringTraining} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sesi Pelatihan Mendatang</CardTitle>
              <Link href="/hse/training/sessions">
                <Button variant="outline" size="sm">
                  Lihat Semua
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <SessionList sessions={upcomingSessions} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Daftar Kursus Pelatihan</CardTitle>
              <div className="flex gap-2">
                <Link href="/hse/training/courses/new">
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Kursus
                  </Button>
                </Link>
                <Link href="/hse/training/courses">
                  <Button variant="outline" size="sm">
                    Kelola Kursus
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Klik &quot;Kelola Kursus&quot; untuk melihat dan mengelola daftar kursus pelatihan
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
