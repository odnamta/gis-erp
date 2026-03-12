'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  IntegrationConnection,
  SyncMapping,
} from '@/types/integration'
import { getConnection } from '@/lib/integration-actions'
import {
  listSyncMappings,
  deleteSyncMapping,
  toggleSyncMappingActive,
} from '@/lib/sync-mapping-actions'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  Plus,
  MoreHorizontal,
  Edit,
  Power,
  PowerOff,
  Trash2,
  ArrowLeft,
  ArrowRightLeft,
  ArrowRight,
  ArrowLeft as ArrowLeftIcon,
  Settings2,
} from 'lucide-react'


// Direction icons
const DIRECTION_ICONS = {
  push: <ArrowRight className="h-4 w-4" />,
  pull: <ArrowLeftIcon className="h-4 w-4" />,
  bidirectional: <ArrowRightLeft className="h-4 w-4" />,
}

// Direction labels
const DIRECTION_LABELS = {
  push: 'Push',
  pull: 'Pull',
  bidirectional: 'Bidirectional',
}

// Frequency labels
const FREQUENCY_LABELS = {
  realtime: 'Real-time',
  hourly: 'Hourly',
  daily: 'Daily',
  manual: 'Manual',
}

export default function SyncMappingsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const connectionId = params.id as string

  const [connection, setConnection] = useState<IntegrationConnection | null>(null)
  const [mappings, setMappings] = useState<SyncMapping[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [mappingToDelete, setMappingToDelete] = useState<SyncMapping | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    loadData()
  }, [connectionId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setIsLoading(true)
    
    // Load connection
    const connResult = await getConnection(connectionId)
    if (!connResult.success || !connResult.data) {
      toast({
        title: 'Error',
        description: connResult.error || 'Connection not found',
        variant: 'destructive',
      })
      router.push('/settings/integrations')
      return
    }
    setConnection(connResult.data)

    // Load mappings
    const mappingsResult = await listSyncMappings(connectionId)
    if (!mappingsResult.success) {
      toast({
        title: 'Error',
        description: mappingsResult.error || 'Failed to load mappings',
        variant: 'destructive',
      })
    } else {
      setMappings(mappingsResult.data || [])
    }
    
    setIsLoading(false)
  }

  const handleToggleActive = async (mapping: SyncMapping) => {
    const result = await toggleSyncMappingActive(mapping.id)
    if (!result.success) {
      toast({
        title: 'Error',
        description: result.error || 'Failed to update mapping',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: `Mapping ${mapping.is_active ? 'deactivated' : 'activated'}`,
      })
      loadData()
    }
  }

  const handleDelete = async () => {
    if (!mappingToDelete) return

    setIsDeleting(true)
    const result = await deleteSyncMapping(mappingToDelete.id)
    setIsDeleting(false)
    setDeleteDialogOpen(false)

    if (!result.success) {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete mapping',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: 'Mapping deleted',
      })
      loadData()
    }
    setMappingToDelete(null)
  }


  if (isLoading) {
    return (
      <div className="container mx-auto py-6 max-w-6xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/settings/integrations')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
          <h1 className="text-2xl font-bold">Sync Mappings</h1>
          <p className="text-muted-foreground mt-1">
            Configure field mappings for {connection?.connection_name}
          </p>
        </div>
        <Button onClick={() => router.push(`/settings/integrations/${connectionId}/mappings/new`)}>
          <Plus className="h-4 w-4 mr-2" />
          New Mapping
        </Button>
      </div>

      {/* Mappings Table */}
      <Card>
        <CardContent className="p-0">
          {mappings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Settings2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No sync mappings</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create a mapping to define how data syncs between systems
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Local Table</TableHead>
                  <TableHead>Remote Entity</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Fields</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {mapping.local_table}
                      </code>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {mapping.remote_entity}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {DIRECTION_ICONS[mapping.sync_direction]}
                        <span className="text-sm">{DIRECTION_LABELS[mapping.sync_direction]}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {FREQUENCY_LABELS[mapping.sync_frequency]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {mapping.field_mappings.length} field{mapping.field_mappings.length !== 1 ? 's' : ''}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={mapping.is_active ? 'default' : 'secondary'}>
                        {mapping.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/settings/integrations/${connectionId}/mappings/${mapping.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleActive(mapping)}>
                            {mapping.is_active ? (
                              <>
                                <PowerOff className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Power className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setMappingToDelete(mapping)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Mapping</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the mapping for &quot;{mappingToDelete?.local_table}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
