'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { createQuotation, updateQuotation } from '@/app/(main)/quotations/actions'
import { createCustomer } from '@/app/(main)/customers/actions'
import { createProject } from '@/app/(main)/projects/actions'
import { QuotationWithRelations, QuotationCreateInput, ScopeOfWork, SCOPE_OF_WORK_LABELS, TRANSPORT_SCOPES } from '@/types/quotation'
import { TerrainType } from '@/types/market-classification'
import { format } from 'date-fns'
import { CalendarIcon, Save, ArrowLeft, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ManagedSelect } from '@/components/ui/managed-select'
import Link from 'next/link'

interface QuotationFormProps {
  customers: { id: string; name: string }[]
  projects: { id: string; name: string; customer_id: string }[]
  quotation?: QuotationWithRelations
}

export function QuotationForm({ customers: initialCustomers, projects: initialProjects, quotation }: QuotationFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [customers, setCustomers] = useState(initialCustomers)
  const [projects, setProjects] = useState(initialProjects)

  // Quick add dialogs
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerCompany, setNewCustomerCompany] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [isSavingCustomer, setIsSavingCustomer] = useState(false)
  const [isSavingProject, setIsSavingProject] = useState(false)

  const [formData, setFormData] = useState<QuotationCreateInput>({
    customer_id: quotation?.customer_id || '',
    project_id: quotation?.project_id || undefined,
    title: quotation?.title || '',
    commodity: quotation?.commodity || '',
    rfq_number: quotation?.rfq_number || '',
    rfq_date: quotation?.rfq_date || undefined,
    rfq_received_date: quotation?.rfq_received_date || undefined,
    rfq_deadline: quotation?.rfq_deadline || undefined,
    origin: quotation?.origin || '',
    destination: quotation?.destination || '',
    cargo_weight_kg: quotation?.cargo_weight_kg ? Number(quotation.cargo_weight_kg) : undefined,
    cargo_length_m: quotation?.cargo_length_m ? Number(quotation.cargo_length_m) : undefined,
    cargo_width_m: quotation?.cargo_width_m ? Number(quotation.cargo_width_m) : undefined,
    cargo_height_m: quotation?.cargo_height_m ? Number(quotation.cargo_height_m) : undefined,
    cargo_value: quotation?.cargo_value ? Number(quotation.cargo_value) : undefined,
    is_new_route: quotation?.is_new_route || false,
    terrain_type: (quotation?.terrain_type as TerrainType) || undefined,
    requires_special_permit: quotation?.requires_special_permit || false,
    is_hazardous: quotation?.is_hazardous || false,
    duration_days: quotation?.duration_days || undefined,
    estimated_shipments: quotation?.estimated_shipments || 1,
    notes: quotation?.notes || '',
    scope_of_work: (quotation?.scope_of_work as ScopeOfWork) || 'inland_transport',
    quotation_ref_number: quotation?.quotation_ref_number || '',
  })

  // Filter projects by selected customer
  const filteredProjects = formData.customer_id
    ? projects.filter(p => p.customer_id === formData.customer_id)
    : projects

  async function handleQuickAddCustomer() {
    if (!newCustomerName.trim()) return
    setIsSavingCustomer(true)
    try {
      const result = await createCustomer({
        name: newCustomerName.trim(),
        company_name: newCustomerCompany.trim() || undefined,
        email: '',
        phone: '',
        address: '',
      })
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else if (result.id) {
        const displayName = newCustomerCompany.trim()
          ? `${newCustomerCompany.trim()} (${newCustomerName.trim()})`
          : newCustomerName.trim()
        const newCustomer = { id: result.id, name: displayName }
        setCustomers(prev => [...prev, newCustomer].sort((a, b) => a.name.localeCompare(b.name)))
        setFormData(prev => ({ ...prev, customer_id: result.id!, project_id: undefined }))
        toast({ title: 'Customer ditambahkan', description: `${displayName} berhasil dibuat. Lengkapi data di halaman Customer nanti.` })
        setNewCustomerName('')
        setNewCustomerCompany('')
        setCustomerDialogOpen(false)
      }
    } finally {
      setIsSavingCustomer(false)
    }
  }

  async function handleQuickAddProject() {
    if (!newProjectName.trim() || !formData.customer_id) return
    setIsSavingProject(true)
    try {
      const result = await createProject({ customer_id: formData.customer_id, name: newProjectName.trim(), status: 'active' })
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else if (result.id) {
        const newProject = { id: result.id, name: newProjectName.trim(), customer_id: formData.customer_id }
        setProjects(prev => [...prev, newProject])
        setFormData(prev => ({ ...prev, project_id: result.id! }))
        toast({ title: 'Project ditambahkan', description: `${newProjectName.trim()} berhasil dibuat.` })
        setNewProjectName('')
        setProjectDialogOpen(false)
      }
    } finally {
      setIsSavingProject(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.customer_id) {
      toast({ title: 'Error', description: 'Please select a customer', variant: 'destructive' })
      return
    }
    if (!formData.title.trim()) {
      toast({ title: 'Error', description: 'Title is required', variant: 'destructive' })
      return
    }
    if (!formData.origin.trim() || !formData.destination.trim()) {
      toast({ title: 'Error', description: 'Origin and destination are required', variant: 'destructive' })
      return
    }

    setIsLoading(true)
    try {
      const result = quotation
        ? await updateQuotation({ ...formData, id: quotation.id })
        : await createQuotation(formData)

      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: quotation ? 'Quotation updated' : 'Quotation created' })
        router.push(`/quotations/${result.data?.id}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customer_id">Customer *</Label>
            <div className="flex gap-2">
              <Select value={formData.customer_id} onValueChange={(v) => {
                const customerProjects = projects.filter(p => p.customer_id === v)
                setFormData({ ...formData, customer_id: v, project_id: customerProjects.length === 1 ? customerProjects[0].id : undefined })
              }}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Pilih customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="icon" title="Tambah Customer Baru">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Tambah Customer Baru</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">Masukkan data customer minimal. Lengkapi nanti di halaman Customer.</p>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Nama Perusahaan</Label>
                      <Input value={newCustomerCompany} onChange={e => setNewCustomerCompany(e.target.value)} placeholder="PT. Contoh Indonesia" autoFocus />
                    </div>
                    <div className="space-y-2">
                      <Label>Nama PIC / Contact Person *</Label>
                      <Input value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} placeholder="Nama kontak" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleQuickAddCustomer())} />
                    </div>
                    <Button type="button" onClick={handleQuickAddCustomer} disabled={!newCustomerName.trim() || isSavingCustomer} className="w-full">
                      {isSavingCustomer ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : <><Plus className="mr-2 h-4 w-4" />Tambah Customer</>}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="project_id">Project (optional)</Label>
            <div className="flex gap-2">
              <Select value={formData.project_id || 'none'} onValueChange={(v) => setFormData({ ...formData, project_id: v === 'none' ? undefined : v })}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Pilih project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa project</SelectItem>
                  {filteredProjects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="icon" title="Tambah Project Baru" disabled={!formData.customer_id}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Tambah Project Baru</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">
                    Project untuk customer: <span className="font-medium">{customers.find(c => c.id === formData.customer_id)?.name}</span>
                  </p>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Nama Project *</Label>
                      <Input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Nama project" autoFocus onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleQuickAddProject())} />
                    </div>
                    <Button type="button" onClick={handleQuickAddProject} disabled={!newProjectName.trim() || isSavingProject} className="w-full">
                      {isSavingProject ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : <><Plus className="mr-2 h-4 w-4" />Tambah Project</>}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Heavy Equipment Transport Jakarta-Surabaya" />
          </div>
          <div className="space-y-2">
            <Label>Scope of Work *</Label>
            <ManagedSelect
              category="scope_of_work"
              value={formData.scope_of_work || undefined}
              onValueChange={(v) => setFormData({ ...formData, scope_of_work: v as ScopeOfWork })}
              placeholder="Pilih scope"
              canManage={true}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="commodity">Commodity</Label>
            <Input id="commodity" value={formData.commodity || ''} onChange={(e) => setFormData({ ...formData, commodity: e.target.value })} placeholder="e.g., Excavator, Transformer" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quotation_ref_number">No. Surat Penawaran</Label>
            <Input id="quotation_ref_number" value={formData.quotation_ref_number || ''} onChange={(e) => setFormData({ ...formData, quotation_ref_number: e.target.value })} placeholder="e.g., 001/QUO/GIS/II/2026" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="estimated_shipments">Estimated Shipments</Label>
            <Input id="estimated_shipments" type="number" min={1} value={formData.estimated_shipments} onChange={(e) => setFormData({ ...formData, estimated_shipments: parseInt(e.target.value) || 1 })} />
          </div>
        </CardContent>
      </Card>

      {/* RFQ Details */}
      <Card>
        <CardHeader>
          <CardTitle>RFQ Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>RFQ Number</Label>
            <Input value={formData.rfq_number || ''} onChange={(e) => setFormData({ ...formData, rfq_number: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>RFQ Date</Label>
            <DatePicker date={formData.rfq_date ? new Date(formData.rfq_date) : undefined} onSelect={(d) => setFormData({ ...formData, rfq_date: d ? format(d, 'yyyy-MM-dd') : undefined })} />
          </div>
          <div className="space-y-2">
            <Label>Received Date</Label>
            <DatePicker date={formData.rfq_received_date ? new Date(formData.rfq_received_date) : undefined} onSelect={(d) => setFormData({ ...formData, rfq_received_date: d ? format(d, 'yyyy-MM-dd') : undefined })} />
          </div>
          <div className="space-y-2">
            <Label>Deadline</Label>
            <DatePicker date={formData.rfq_deadline ? new Date(formData.rfq_deadline) : undefined} onSelect={(d) => setFormData({ ...formData, rfq_deadline: d ? format(d, 'yyyy-MM-dd') : undefined })} />
          </div>
        </CardContent>
      </Card>

      {/* Route */}
      <Card>
        <CardHeader>
          <CardTitle>Route</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="origin">Origin *</Label>
            <Input id="origin" value={formData.origin} onChange={(e) => setFormData({ ...formData, origin: e.target.value })} placeholder="e.g., Jakarta" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="destination">Destination *</Label>
            <Input id="destination" value={formData.destination} onChange={(e) => setFormData({ ...formData, destination: e.target.value })} placeholder="e.g., Surabaya" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration_days">Duration (days)</Label>
            <Input id="duration_days" type="number" min={1} value={formData.duration_days || ''} onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) || undefined })} />
          </div>
          <div className="space-y-2">
            <Label>Terrain Type</Label>
            <ManagedSelect
              category="terrain_type"
              value={formData.terrain_type || undefined}
              onValueChange={(v) => setFormData({ ...formData, terrain_type: v as TerrainType })}
              placeholder="Pilih terrain"
              canManage={true}
            />
          </div>
        </CardContent>
      </Card>

      {/* Cargo Specifications — only for transport/multi-scope */}
      {TRANSPORT_SCOPES.includes(formData.scope_of_work as ScopeOfWork) && (
        <Card>
          <CardHeader>
            <CardTitle>Cargo Specifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label>Weight (kg)</Label>
                <Input type="number" min={0} value={formData.cargo_weight_kg || ''} onChange={(e) => setFormData({ ...formData, cargo_weight_kg: parseFloat(e.target.value) || undefined })} />
              </div>
              <div className="space-y-2">
                <Label>Length (m)</Label>
                <Input type="number" min={0} step={0.1} value={formData.cargo_length_m || ''} onChange={(e) => setFormData({ ...formData, cargo_length_m: parseFloat(e.target.value) || undefined })} />
              </div>
              <div className="space-y-2">
                <Label>Width (m)</Label>
                <Input type="number" min={0} step={0.1} value={formData.cargo_width_m || ''} onChange={(e) => setFormData({ ...formData, cargo_width_m: parseFloat(e.target.value) || undefined })} />
              </div>
              <div className="space-y-2">
                <Label>Height (m)</Label>
                <Input type="number" min={0} step={0.1} value={formData.cargo_height_m || ''} onChange={(e) => setFormData({ ...formData, cargo_height_m: parseFloat(e.target.value) || undefined })} />
              </div>
              <div className="space-y-2">
                <Label>Cargo Value (IDR)</Label>
                <Input type="number" min={0} value={formData.cargo_value || ''} onChange={(e) => setFormData({ ...formData, cargo_value: parseFloat(e.target.value) || undefined })} />
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-2">
                <Switch id="is_new_route" checked={formData.is_new_route} onCheckedChange={(v) => setFormData({ ...formData, is_new_route: v })} />
                <Label htmlFor="is_new_route">New Route</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="requires_special_permit" checked={formData.requires_special_permit} onCheckedChange={(v) => setFormData({ ...formData, requires_special_permit: v })} />
                <Label htmlFor="requires_special_permit">Requires Special Permit</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="is_hazardous" checked={formData.is_hazardous} onCheckedChange={(v) => setFormData({ ...formData, is_hazardous: v })} />
                <Label htmlFor="is_hazardous">Hazardous Cargo</Label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button type="button" variant="outline" asChild>
          <Link href="/quotations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Link>
        </Button>
        <Button type="submit" disabled={isLoading}>
          <Save className="mr-2 h-4 w-4" />
          {isLoading ? 'Saving...' : quotation ? 'Update Quotation' : 'Create Quotation'}
        </Button>
      </div>
    </form>
  )
}

function DatePicker({ date, onSelect }: { date?: Date; onSelect: (date?: Date) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'dd/MM/yyyy') : 'Select date'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
