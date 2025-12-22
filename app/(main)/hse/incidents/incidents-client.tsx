'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus } from 'lucide-react';
import { IncidentList } from '@/components/hse';
import { Incident } from '@/types/incident';

interface IncidentsClientProps {
  incidents: Incident[];
}

export function IncidentsClient({ incidents }: IncidentsClientProps) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/hse">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Daftar Insiden</h1>
            <p className="text-muted-foreground">
              {incidents.length} insiden tercatat
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/hse/incidents/report">
            <Plus className="h-4 w-4 mr-2" />
            Laporkan Insiden
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Semua Insiden</CardTitle>
        </CardHeader>
        <CardContent>
          <IncidentList incidents={incidents} />
        </CardContent>
      </Card>
    </div>
  );
}
