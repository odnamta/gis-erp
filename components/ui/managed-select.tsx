'use client'

import { useState, useEffect, useTransition } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Plus, Loader2 } from 'lucide-react'
import { getSystemOptions, addSystemOption, SystemOption } from '@/lib/system-options-actions'
import { useToast } from '@/hooks/use-toast'

interface ManagedSelectProps {
  /** The system_options category to load (e.g., 'carrier_type', 'cost_category') */
  category: string
  /** Current selected value */
  value: string | undefined
  /** Callback when value changes */
  onValueChange: (value: string) => void
  /** Placeholder text when nothing selected */
  placeholder?: string
  /** Whether the current user can add new options (manager+ roles) */
  canManage?: boolean
  /** Optional className for the select trigger */
  className?: string
  /** Whether the select is disabled */
  disabled?: boolean
  /** Optional: include a "none" option at the top (for optional fields) */
  allowNone?: boolean
  /** Label for the "none" option */
  noneLabel?: string
}

export function ManagedSelect({
  category,
  value,
  onValueChange,
  placeholder = 'Pilih...',
  canManage = false,
  className,
  disabled,
  allowNone = false,
  noneLabel = 'Tidak dipilih',
}: ManagedSelectProps) {
  const [options, setOptions] = useState<SystemOption[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  useEffect(() => {
    loadOptions()
  }, [category])

  async function loadOptions() {
    setLoading(true)
    const result = await getSystemOptions(category)
    if (result.data) {
      setOptions(result.data)
    }
    setLoading(false)
  }

  async function handleAdd() {
    if (!newLabel.trim()) return
    startTransition(async () => {
      const result = await addSystemOption({
        category,
        value: newLabel.trim(),
        label: newLabel.trim(),
      })
      if (result.success) {
        await loadOptions()
        onValueChange(newLabel.trim())
        setNewLabel('')
        setAddOpen(false)
        toast({ title: 'Opsi baru ditambahkan', description: `"${newLabel.trim()}" berhasil ditambahkan.` })
      } else {
        toast({ title: 'Gagal menambahkan', description: result.error, variant: 'destructive' })
      }
    })
  }

  if (loading) {
    return (
      <div className="flex gap-2">
        <Select disabled>
          <SelectTrigger className={className || 'flex-1'}>
            <SelectValue placeholder="Memuat..." />
          </SelectTrigger>
        </Select>
      </div>
    )
  }

  // Check if current value exists in options (handles legacy values not in DB)
  const valueExists = !value || value === '__none__' || options.some(o => o.value === value)

  return (
    <div className="flex gap-2">
      <Select
        value={value ? value : (allowNone ? '__none__' : undefined)}
        onValueChange={(v) => onValueChange(v === '__none__' ? '' : v)}
        disabled={disabled}
      >
        <SelectTrigger className={className || 'flex-1'}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowNone && (
            <SelectItem value="__none__">{noneLabel}</SelectItem>
          )}
          {/* Show legacy value if it's not in the options list */}
          {!valueExists && value && (
            <SelectItem value={value}>{value} (legacy)</SelectItem>
          )}
          {options.map(o => (
            <SelectItem key={o.id} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {canManage && (
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="icon" title="Tambah opsi baru" disabled={disabled}>
              <Plus className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <div className="space-y-2">
              <p className="text-sm font-medium">Tambah Opsi Baru</p>
              <Input
                placeholder="Nama opsi..."
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAdd()
                  }
                }}
                autoFocus
              />
              <Button
                type="button"
                size="sm"
                className="w-full"
                onClick={handleAdd}
                disabled={!newLabel.trim() || isPending}
              >
                {isPending ? (
                  <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Menambahkan...</>
                ) : (
                  <><Plus className="mr-2 h-3 w-3" />Tambah</>
                )}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
