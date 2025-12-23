import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ResourceList } from '@/components/resource-scheduling/resource-list'
import { ResourceCalendar } from '@/components/resource-scheduling/resource-calendar'
import { UtilizationReport } from '@/components/resource-scheduling/utilization-report'
import { getResources } from '@/lib/resource-scheduling-actions'
import { Plus, Calendar, Users, Wrench, BarChart3 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ResourcesPage() {
  const resources = await getResources()
  
  const personnelResources = resources.filter(r => r.resource_type === 'personnel')
  const equipmentResources = resources.filter(r => 
    r.resource_type === 'equipment' || r.resource_type === 'tool' || r.resource_type === 'vehicle'
  )

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Engineering Resources</h1>
          <p className="text-muted-foreground">
            Manage and schedule engineering personnel, equipment, and tools
          </p>
        </div>
        <Button asChild>
          <Link href="/engineering/resources/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Resource
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="personnel" className="gap-2">
            <Users className="h-4 w-4" />
            Personnel ({personnelResources.length})
          </TabsTrigger>
          <TabsTrigger value="equipment" className="gap-2">
            <Wrench className="h-4 w-4" />
            Equipment ({equipmentResources.length})
          </TabsTrigger>
          <TabsTrigger value="utilization" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Utilization
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
            <ResourceCalendar />
          </Suspense>
        </TabsContent>

        <TabsContent value="personnel">
          <ResourceList resources={personnelResources} />
        </TabsContent>

        <TabsContent value="equipment">
          <ResourceList resources={equipmentResources} />
        </TabsContent>

        <TabsContent value="utilization">
          <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
            <UtilizationReport />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
