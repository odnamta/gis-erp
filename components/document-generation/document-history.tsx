'use client'

import { useState, useEffect } from 'react'
import {
  DocumentType,
  DocumentHistoryFilters,
  GeneratedDocumentWithRelations,
  VALID_DOCUMENT_TYPES,
} from '@/types/document-generation'
import { getGenerationHistory } from '@/lib/document-generator-actions'
import { sendDocumentEmail } from '@/lib/document-email-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  Download,
  Mail,
  MoreHorizontal,
  ExternalLink,
  FileText,
  Search,
  Calendar,
  Filter,
  RefreshCw,
  Receipt,
  FileSpreadsheet,
  Truck,
  FileCheck,
  ClipboardList,
  Package,
} from 'lucide-react'

// Document type labels
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

interface DocumentHistoryProps {
  entityType?: string
  entityId?: string
  showFilters?: boolean
  title?: string
  description?: string
  maxItems?: number
}

export function DocumentHistory({
  entityType,
  entityId,
  showFilters = true,
  title = 'Document History',
  description = 'View and manage generated documents',
  maxItems,
}: DocumentHistoryProps) {
  const { toast } = useToast()

  const [documents, setDocuments] = useState<GeneratedDocumentWithRelations[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<GeneratedDocumentWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filters
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Email dialog
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<GeneratedDocumentWithRelations | null>(null)
  const [emailTo, setEmailTo] = useState<string>('')
  const [emailSubject, setEmailSubject] = useState<string>('')
  const [emailBody, setEmailBody] = useState<string>('')
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  // Load documents on mount
  useEffect(() => {
    loadDocuments()
  }, [entityType, entityId])

  // Apply filters
  useEffect(() => {
    let filtered = [...documents]

    // Document type filter
    if (documentTypeFilter !== 'all') {
      filtered = filtered.filter((d) => d.document_type === documentTypeFilter)
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (d) =>
          d.document_number?.toLowerCase().includes(query) ||
          d.file_name.toLowerCase().includes(query) ||
          d.document_templates?.template_name?.toLowerCase().includes(query)
      )
    }

    // Date filters
    if (fromDate) {
      filtered = filtered.filter((d) => new Date(d.generated_at) >= new Date(fromDate))
    }
    if (toDate) {
      filtered = filtered.filter((d) => new Date(d.generated_at) <= new Date(toDate + 'T23:59:59'))
    }

    // Apply max items limit
    if (maxItems && filtered.length > maxItems) {
      filtered = filtered.slice(0, maxItems)
    }

    setFilteredDocuments(filtered)
  }, [documents, documentTypeFilter, searchQuery, fromDate, toDate, maxItems])

  const loadDocuments = async () => {
    setIsLoading(true)
    const filters: DocumentHistoryFilters = {}
    
    if (entityType) {
      filters.entity_type = entityType
    }
    if (entityId) {
      filters.entity_id = entityId
    }

    const result = await getGenerationHistory(filters)
    if (result.success && result.data) {
      setDocuments(result.data)
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to load document history',
        variant: 'destructive',
      })
    }
    setIsLoading(false)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadDocuments()
    setIsRefreshing(false)
  }

  const handleDownload = (document: GeneratedDocumentWithRelations) => {
    if (document.file_url) {
      window.open(document.file_url, '_blank')
    }
  }

  const handleOpenEmailDialog = (document: GeneratedDocumentWithRelations) => {
    setSelectedDocument(document)
    setEmailTo('')
    setEmailSubject(`${DOCUMENT_TYPE_LABELS[document.document_type]}: ${document.document_number || document.file_name}`)
    setEmailBody(`Please find attached the ${DOCUMENT_TYPE_LABELS[document.document_type].toLowerCase()} document.`)
    setEmailDialogOpen(true)
  }

  const handleSendEmail = async () => {
    if (!selectedDocument || !emailTo) {
      toast({
        title: 'Error',
        description: 'Please enter a recipient email address',
        variant: 'destructive',
      })
      return
    }

    setIsSendingEmail(true)
    const result = await sendDocumentEmail(selectedDocument.id, {
      to: emailTo.split(',').map((e) => e.trim()),
      subject: emailSubject,
      body: emailBody,
      attachment_url: selectedDocument.file_url,
      attachment_name: selectedDocument.file_name,
    })
    setIsSendingEmail(false)

    if (result.success) {
      toast({
        title: 'Success',
        description: 'Email sent successfully',
      })
      setEmailDialogOpen(false)
      // Refresh to show updated email status
      loadDocuments()
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to send email',
        variant: 'destructive',
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatFileSize = (sizeKb: number) => {
    if (sizeKb < 1024) {
      return `${sizeKb} KB`
    }
    return `${(sizeKb / 1024).toFixed(1)} MB`
  }

  const clearFilters = () => {
    setDocumentTypeFilter('all')
    setFromDate('')
    setToDate('')
    setSearchQuery('')
  }

  const hasActiveFilters = documentTypeFilter !== 'all' || fromDate || toDate || searchQuery

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        {showFilters && (
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
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
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-[140px]"
                  placeholder="From"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-[140px]"
                  placeholder="To"
                />
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <Filter className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Documents Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No documents found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {documents.length === 0
                ? 'No documents have been generated yet'
                : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Generated</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Email Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((document) => (
                <TableRow key={document.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {document.document_number || document.file_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {document.document_templates?.template_name || 'Unknown template'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {DOCUMENT_TYPE_ICONS[document.document_type]}
                      <Badge variant="outline">
                        {DOCUMENT_TYPE_LABELS[document.document_type]}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{formatDate(document.generated_at)}</p>
                      {document.user_profiles?.full_name && (
                        <p className="text-xs text-muted-foreground">
                          by {document.user_profiles.full_name}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatFileSize(document.file_size_kb)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {document.sent_to_email ? (
                      <div>
                        <Badge variant="default" className="text-xs">
                          Sent
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {document.sent_to_email}
                        </p>
                      </div>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Not sent
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownload(document)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => window.open(document.file_url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open in New Tab
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleOpenEmailDialog(document)}>
                          <Mail className="h-4 w-4 mr-2" />
                          Send via Email
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Results count */}
        {!isLoading && filteredDocuments.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredDocuments.length} of {documents.length} documents
          </div>
        )}
      </CardContent>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Send Document via Email
            </DialogTitle>
            <DialogDescription>
              Send {selectedDocument?.file_name} to one or more recipients
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email-to">To (comma-separated for multiple)</Label>
              <Input
                id="email-to"
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="recipient@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-body">Message</Label>
              <textarea
                id="email-body"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={isSendingEmail || !emailTo}>
              {isSendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
