'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, AlertTriangle } from 'lucide-react';
import {
  IncidentSummaryCards,
  IncidentList,
  IncidentTrendChart,
} from '@/components/hse';
import { Incident, IncidentDashboardSummary, IncidentStatistics } from '@/types/incident';

interface HSEClientProps {
  summary?: IncidentDashboardSummary;
  recentIncidents: Incident[];
  statistics?: IncidentStatistics;
}

export function HSEClient({ summary, recentIncidents, statistics }: HSEClientProps) {
  const defaultSummary: IncidentDashboardSummary = {
    openIncidents: 0,
    underInvestigation: 0,
    nearMissesMTD: 0,
    injuriesMTD: 0,
    daysSinceLastLTI: 0,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">HSE Dashboard</h1>
          <p className="text-muted-foreground">
            Health, Safety & Environment - Incident Reporting
          </p>
        </div>
        <Button asChild>
          <Link href="/hse/incidents/report">
            <Plus className="h-4 w-4 mr-2" />
            Laporkan Insiden
          </Link>
        </Button>
      </div>

      <IncidentSummaryCards summary={summary || defaultSummary} />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="incidents">Insiden Terbuka</TabsTrigger>
          <TabsTrigger value="statistics">Statistik</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {statistics?.monthlyTrend && (
              <IncidentTrendChart data={statistics.monthlyTrend} />
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Insiden per Severity</CardTitle>
              </CardHeader>
              <CardContent>
                {statistics?.bySeverity ? (
                  <div className="space-y-3">
                    {Object.entries(statistics.bySeverity).map(([severity, count]) => (
                      <div key={severity} className="flex items-center justify-between">
                        <span className="capitalize">{severity}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Tidak ada data</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Insiden Terbaru</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/hse/incidents">Lihat Semua</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentIncidents.length > 0 ? (
                <IncidentList incidents={recentIncidents.slice(0, 6)} showFilters={false} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Tidak ada insiden terbuka</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Insiden Terbuka</CardTitle>
            </CardHeader>
            <CardContent>
              <IncidentList incidents={recentIncidents} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Total Insiden (YTD)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{statistics?.totalIncidents || 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Near Miss (YTD)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-yellow-600">
                  {statistics?.nearMisses || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cedera (YTD)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600">
                  {statistics?.injuries || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hari Kerja Hilang</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{statistics?.daysLost || 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Investigasi Terbuka</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-600">
                  {statistics?.openInvestigations || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hari Tanpa LTI</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  {statistics?.daysSinceLastLTI || 0}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
