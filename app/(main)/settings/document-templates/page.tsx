'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  DocumentTemplate,
  DocumentType,
  VALID_DOCUMENT_TYPES,
} from '@/types/document-generation'
import {
  listTemplates,
  activateTemplate,
  deactivateTemplate,
  deleteTemplate,
} from '@/lib/document-template-actions'
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
  Eye,
  Power,
  PowerOff,
  Trash2,
  FileText,
  FileSpreadsheet,
  Receipt,
  FileCheck,
  ClipboardList,
  Package,
  Truck,
} from 'lucide-react'

// Document type labels for display
const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  invoice: 'Invoice',
  quotation: 'Quotation',
  contract: 'Contract',
  certificate: 'Certificate',
  report: 'Report',
  packing_list: 'Packing List',
  delivery_note: 'Delivery Note',
}

// Document type icons
const DOCUMENT_TYPE_ICONS: Record<DocumentType, React.ReactNode> = {
  invoice: <Receipt className="h-4 w-4" />,
  quotation: <FileSpreadsheet className="h-4 w-4" />,
  contract: <FileCheck className="h-4 w-4" />,
  certificate: <FileText className="h-4 w-4" />,
  report: <ClipboardList className="h-4 w-4" />,
  packing_list: <Package className="h-4 w-4" />,
  delivery_note: <Truck className="h-4 w-4" />,
}

export default function DocumentTemplatesPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<DocumentTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<DocumentTemplate | null>(null)
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

    // Document type filter
    if (documentTypeFilter !== 'all') {
      filtered = filtered.filter((t) => t.document_type === documentTypeFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) =>
        statusFilter === 'active' ? t.is_active : !t.is_active
      )
    }

    setFilteredTemplates(filtered)
  }, [templates, searchQuery, documentTypeFilter, statusFilter])

  const loadTemplates = async () => {
    setIsLoading(true)
    const result = await listTemplates()
    if (!result.success) {
      toast({
        title: 'Error',
        description: result.error || 'Failed to load templates',
        variant: 'destructive',
      })
    } else {
      setTemplates(result.data || [])
    }
    setIsLoading(false)
  }

  const handleToggleActive = async (template: DocumentTemplate) => {
    const action = template.is_active ? deactivateTemplate : activateTemplate

    const result = await action(template.id)
    if (!result.success) {
      toast({
        title: 'Error',
        description: result.error || 'Failed to update template',
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
    const result = await deleteTemplate(templateToDelete.id)
    setIsDeleting(false)
    setDeleteDialogOpen(false)

    if (!result.success) {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete template',
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Document Templates</h1>
          <p className="text-muted-foreground mt-1">
            Manage PDF document templates for invoices, quotations, and more
          </p>
        </div>
        <Button onClick={() => router.push('/settings/document-templates/new')}>
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
            <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Document Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {VALID_DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {DOCUMENT_TYPE_LABELS[type]}
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
                  ? 'Create your first document template'
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Page Settings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
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
                      <div className="flex items-center gap-2">
                        {DOCUMENT_TYPE_ICONS[template.document_type]}
                        <Badge variant="outline">
                          {DOCUMENT_TYPE_LABELS[template.document_type]}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {template.page_size} • {template.orientation}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.is_active ? 'default' : 'secondary'}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(template.created_at)}
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
                            onClick={() =>
                              router.push(`/settings/document-templates/${template.id}`)
                            }
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/settings/document-templates/${template.id}/edit`)
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
