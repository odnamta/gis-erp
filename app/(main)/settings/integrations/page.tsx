'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  IntegrationConnection,
  IntegrationType,
  Provider,
  VALID_INTEGRATION_TYPES,
  VALID_PROVIDERS,
} from '@/types/integration'
import {
  listConnections,
  deleteConnection,
  toggleConnectionActive,
  testConnection,
} from '@/lib/integration-actions'
import {
  formatIntegrationType,
  formatProvider,
} from '@/lib/integration-utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Settings2,
  Power,
  PowerOff,
  Trash2,
  Link2,
  Calculator,
  MapPin,
  Mail,
  HardDrive,
  MessageSquare,
  Wrench,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  History,
} from 'lucide-react'


// Integration type icons
const INTEGRATION_TYPE_ICONS: Record<IntegrationType, React.ReactNode> = {
  accounting: <Calculator className="h-4 w-4" />,
  tracking: <MapPin className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  storage: <HardDrive className="h-4 w-4" />,
  messaging: <MessageSquare className="h-4 w-4" />,
  custom: <Wrench className="h-4 w-4" />,
}

// Integration type badge colors
const INTEGRATION_TYPE_COLORS: Record<IntegrationType, string> = {
  accounting: 'bg-blue-100 text-blue-800 border-blue-200',
  tracking: 'bg-green-100 text-green-800 border-green-200',
  email: 'bg-purple-100 text-purple-800 border-purple-200',
  storage: 'bg-orange-100 text-orange-800 border-orange-200',
  messaging: 'bg-pink-100 text-pink-800 border-pink-200',
  custom: 'bg-gray-100 text-gray-800 border-gray-200',
}

// Provider badge colors
const PROVIDER_COLORS: Record<Provider, string> = {
  accurate: 'bg-indigo-100 text-indigo-800',
  jurnal: 'bg-cyan-100 text-cyan-800',
  xero: 'bg-sky-100 text-sky-800',
  google_sheets: 'bg-emerald-100 text-emerald-800',
  whatsapp: 'bg-green-100 text-green-800',
  telegram: 'bg-blue-100 text-blue-800',
  slack: 'bg-violet-100 text-violet-800',
  google_drive: 'bg-yellow-100 text-yellow-800',
  dropbox: 'bg-blue-100 text-blue-800',
}

export default function IntegrationsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [connections, setConnections] = useState<IntegrationConnection[]>([])
  const [filteredConnections, setFilteredConnections] = useState<IntegrationConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [providerFilter, setProviderFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [connectionToDelete, setConnectionToDelete] = useState<IntegrationConnection | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [testingConnectionId, setTestingConnectionId] = useState<string | null>(null)

  // Load connections
  useEffect(() => {
    loadConnections()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Filter connections
  useEffect(() => {
    let filtered = [...connections]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.connection_code.toLowerCase().includes(query) ||
          c.connection_name.toLowerCase().includes(query)
      )
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((c) => c.integration_type === typeFilter)
    }

    // Provider filter
    if (providerFilter !== 'all') {
      filtered = filtered.filter((c) => c.provider === providerFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((c) =>
        statusFilter === 'active' ? c.is_active : !c.is_active
      )
    }

    setFilteredConnections(filtered)
  }, [connections, searchQuery, typeFilter, providerFilter, statusFilter])

  const loadConnections = async () => {
    setIsLoading(true)
    const result = await listConnections()
    if (!result.success) {
      toast({
        title: 'Error',
        description: result.error || 'Failed to load connections',
        variant: 'destructive',
      })
    } else {
      setConnections(result.data || [])
    }
    setIsLoading(false)
  }


  const handleToggleActive = async (connection: IntegrationConnection) => {
    const result = await toggleConnectionActive(connection.id)
    if (!result.success) {
      toast({
        title: 'Error',
        description: result.error || 'Failed to update connection',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: `Connection ${connection.is_active ? 'deactivated' : 'activated'}`,
      })
      loadConnections()
    }
  }

  const handleTestConnection = async (connection: IntegrationConnection) => {
    setTestingConnectionId(connection.id)
    const result = await testConnection(connection.id)
    setTestingConnectionId(null)

    if (!result.success) {
      toast({
        title: 'Error',
        description: result.error || 'Failed to test connection',
        variant: 'destructive',
      })
    } else if (result.data) {
      if (result.data.success) {
        toast({
          title: 'Connection Successful',
          description: `Response time: ${result.data.response_time_ms}ms`,
        })
      } else {
        toast({
          title: 'Connection Failed',
          description: result.data.message,
          variant: 'destructive',
        })
      }
      loadConnections()
    }
  }

  const handleDelete = async () => {
    if (!connectionToDelete) return

    setIsDeleting(true)
    const result = await deleteConnection(connectionToDelete.id)
    setIsDeleting(false)
    setDeleteDialogOpen(false)

    if (!result.success) {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete connection',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: 'Connection deleted',
      })
      loadConnections()
    }
    setConnectionToDelete(null)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getConnectionStatus = (connection: IntegrationConnection) => {
    if (!connection.is_active) {
      return { label: 'Inactive', color: 'bg-gray-100 text-gray-800', icon: <PowerOff className="h-3 w-3" /> }
    }
    if (connection.last_error) {
      return { label: 'Error', color: 'bg-red-100 text-red-800', icon: <AlertCircle className="h-3 w-3" /> }
    }
    if (connection.last_sync_at) {
      return { label: 'Connected', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-3 w-3" /> }
    }
    return { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> }
  }


  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">External Integrations</h1>
          <p className="text-muted-foreground mt-1">
            Manage connections to accounting, GPS tracking, and cloud storage systems
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/settings/integrations/history')}>
            <History className="h-4 w-4 mr-2" />
            Sync History
          </Button>
          <Button onClick={() => router.push('/settings/integrations/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Connection
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search connections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {VALID_INTEGRATION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {formatIntegrationType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {VALID_PROVIDERS.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {formatProvider(provider)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>


      {/* Connections Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConnections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Link2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No connections found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {connections.length === 0
                  ? 'Create your first integration connection'
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Connection</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConnections.map((connection) => {
                  const status = getConnectionStatus(connection)
                  return (
                    <TableRow key={connection.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{connection.connection_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {connection.connection_code}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {INTEGRATION_TYPE_ICONS[connection.integration_type]}
                          <Badge variant="outline" className={INTEGRATION_TYPE_COLORS[connection.integration_type]}>
                            {formatIntegrationType(connection.integration_type)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={PROVIDER_COLORS[connection.provider]}>
                          {formatProvider(connection.provider)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className={status.color}>
                            <span className="flex items-center gap-1">
                              {status.icon}
                              {status.label}
                            </span>
                          </Badge>
                          {connection.last_error && (
                            <p className="text-xs text-red-600 max-w-[200px] truncate" title={connection.last_error}>
                              {connection.last_error}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(connection.last_sync_at)}
                        </span>
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
                              onClick={() => router.push(`/settings/integrations/${connection.id}`)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/settings/integrations/${connection.id}/mappings`)}
                            >
                              <Settings2 className="h-4 w-4 mr-2" />
                              Sync Mappings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleTestConnection(connection)}
                              disabled={testingConnectionId === connection.id}
                            >
                              {testingConnectionId === connection.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                              )}
                              Test Connection
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(connection)}>
                              {connection.is_active ? (
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
                                setConnectionToDelete(connection)
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
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>


      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Connection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{connectionToDelete?.connection_name}&quot;? This
              will also remove all sync mappings and history. This action cannot be undone.
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
