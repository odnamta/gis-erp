'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import type { JournalEntry, JournalEntryStatus, JournalEntrySourceType } from '@/types/accounting'
import { JOURNAL_ENTRY_STATUS_LABELS, JOURNAL_ENTRY_SOURCE_LABELS } from '@/types/accounting'

const STATUS_COLORS: Record<JournalEntryStatus, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  posted: 'bg-green-100 text-green-800',
  reversed: 'bg-red-100 text-red-800',
}

interface Props {
  entries: JournalEntry[]
  canWrite: boolean
}

export function JournalEntriesClient({ entries, canWrite }: Props) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterSource, setFilterSource] = useState<string>('all')

  const filtered = entries.filter((e) => {
    const matchesSearch =
      !search ||
      e.entry_number.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = filterStatus === 'all' || e.status === filterStatus
    const matchesSource = filterSource === 'all' || e.source_type === filterSource
    return matchesSearch && matchesStatus && matchesSource
  })

  // Stats
  const draftCount = entries.filter((e) => e.status === 'draft').length
  const postedCount = entries.filter((e) => e.status === 'posted').length
  const _totalDebit = entries
    .filter((e) => e.status === 'posted')
    .reduce((s, e) => s + e.total_debit, 0)

  return (
    <>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Total Jurnal</p>
          <p className="text-2xl font-bold">{entries.length}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Draft</p>
          <p className="text-2xl font-bold text-yellow-600">{draftCount}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Posted</p>
          <p className="text-2xl font-bold text-green-600">{postedCount}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nomor atau deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {(Object.keys(JOURNAL_ENTRY_STATUS_LABELS) as JournalEntryStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {JOURNAL_ENTRY_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sumber" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Sumber</SelectItem>
            {(Object.keys(JOURNAL_ENTRY_SOURCE_LABELS) as JournalEntrySourceType[]).map((s) => (
              <SelectItem key={s} value={s}>
                {JOURNAL_ENTRY_SOURCE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canWrite && (
          <Link href="/finance/journal-entries/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Buat Jurnal
            </Button>
          </Link>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Nomor</TableHead>
              <TableHead className="w-[100px]">Tanggal</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead className="w-[100px]">Sumber</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="text-right w-[140px]">Debit</TableHead>
              <TableHead className="text-right w-[140px]">Kredit</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  {entries.length === 0
                    ? 'Belum ada jurnal. Klik "Buat Jurnal" untuk memulai.'
                    : 'Tidak ada jurnal yang cocok.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-sm">{entry.entry_number}</TableCell>
                  <TableCell className="text-sm">{formatDate(entry.entry_date)}</TableCell>
                  <TableCell className="font-medium truncate max-w-[250px]">
                    {entry.description}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {JOURNAL_ENTRY_SOURCE_LABELS[entry.source_type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={STATUS_COLORS[entry.status]}>
                      {JOURNAL_ENTRY_STATUS_LABELS[entry.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(entry.total_debit)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(entry.total_credit)}
                  </TableCell>
                  <TableCell>
                    <Link href={`/finance/journal-entries/${entry.id}`}>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
