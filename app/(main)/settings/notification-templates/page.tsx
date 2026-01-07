'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  NotificationTemplate,
  EventType,
  EVENT_TYPE_LABELS,
  NOTIFICATION_CHANNELS,
  CHANNEL_LABELS,
} from '@/types/notification-workflows'
import {
  getNotificationTemplates,
  activateNotificationTemplate,
  deactivateNotificationTemplate,
  deleteNotificationTemplate,
} from '@/app/actions/notification-template-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Eye,
  Power,
  PowerOff,
  Trash2,
  Copy,
  Mail,
  MessageSquare,
  Bell,
  Smartphone,
  FileText,
} from 'lucide-react'

export default function NotificationTemplatesPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<NotificationTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<NotificationTemplate | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load templates
  useEffect(() => {
    loadTemplates()
  }, [])

  // Filter templates
  useEffect(() => {
    let filtered = [...templates]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.template_code.toLowerCase().includes(query) ||
          t.template_name.toLowerCase().includes(query)
      )
    }

    // Event type filter
    if (eventTypeFilter !== 'all') {
      filtered = filtered.filter((t) => t.event_type === eventTypeFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) =>
        statusFilter === 'active' ? t.is_active : !t.is_active
      )
    }

    setFilteredTemplates(filtered)
  }, [templates, searchQuery, eventTypeFilter, statusFilter])

  const loadTemplates = async () => {
    setIsLoading(true)
    const { data, error } = await getNotificationTemplates()
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      })
    } else {
      setTemplates(data)
    }
    setIsLoading(false)
  }

  const handleToggleActive = async (template: NotificationTemplate) => {
    const action = template.is_active
      ? deactivateNotificationTemplate
      : activateNotificationTemplate

    const { error } = await action(template.id)
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: `Template ${template.is_active ? 'deactivated' : 'activated'}`,
      })
      loadTemplates()
    }
  }

  const handleDelete = async () => {
    if (!templateToDelete) return

    setIsDeleting(true)
    const { error } = await deleteNotificationTemplate(templateToDelete.id)
    setIsDeleting(false)
    setDeleteDialogOpen(false)

    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: 'Template deleted',
      })
      loadTemplates()
    }
    setTemplateToDelete(null)
  }

  const getChannelIcons = (template: NotificationTemplate) => {
    const icons = []
    if (template.email_body_html || template.email_body_text) {
      icons.push(<span key="email" title="Email"><Mail className="h-4 w-4" /></span>)
    }
    if (template.whatsapp_body) {
      icons.push(<span key="whatsapp" title="WhatsApp"><MessageSquare className="h-4 w-4" /></span>)
    }
    if (template.in_app_body) {
      icons.push(<span key="in_app" title="In-App"><Bell className="h-4 w-4" /></span>)
    }
    if (template.push_body) {
      icons.push(<span key="push" title="Push"><Smartphone className="h-4 w-4" /></span>)
    }
    return icons
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notification Templates</h1>
          <p className="text-muted-foreground mt-1">
            Manage notification templates for automated workflows
          </p>
        </div>
        <Button onClick={() => router.push('/settings/notification-templates/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Event Types</SelectItem>
                {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
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

      {/* Templates Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No templates found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {templates.length === 0
                  ? 'Create your first notification template'
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Channels</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{template.template_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {template.template_code}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {EVENT_TYPE_LABELS[template.event_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {getChannelIcons(template)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.is_active ? 'default' : 'secondary'}>
                        {template.is_active ? 'Active' : 'Inactive'}
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
                            onClick={() =>
                              router.push(`/settings/notification-templates/${template.id}`)
                            }
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/settings/notification-templates/${template.id}/edit`)
                            }
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleActive(template)}>
                            {template.is_active ? (
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
                              setTemplateToDelete(template)
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
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{templateToDelete?.template_name}&quot;? This
              action cannot be undone.
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
