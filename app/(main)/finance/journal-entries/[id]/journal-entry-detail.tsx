'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { postJournalEntry } from '@/lib/gl-actions'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import type { JournalEntryWithLines, JournalEntryStatus } from '@/types/accounting'
import { JOURNAL_ENTRY_STATUS_LABELS, JOURNAL_ENTRY_SOURCE_LABELS } from '@/types/accounting'

const STATUS_COLORS: Record<JournalEntryStatus, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  posted: 'bg-green-100 text-green-800',
  reversed: 'bg-red-100 text-red-800',
}

interface Props {
  entry: JournalEntryWithLines
  canPost: boolean
}

export function JournalEntryDetail({ entry, canPost }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [posting, setPosting] = useState(false)

  async function handlePost() {
    setPosting(true)
    try {
      const result = await postJournalEntry(entry.id)
      if (result.error) {
        toast({ title: result.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Jurnal berhasil diposting' })
      router.refresh()
    } finally {
      setPosting(false)
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/finance/journal-entries">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{entry.entry_number}</h1>
            <p className="text-muted-foreground">{entry.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={STATUS_COLORS[entry.status]}>
            {JOURNAL_ENTRY_STATUS_LABELS[entry.status]}
          </Badge>
          {canPost && entry.status === 'draft' && (
            <Button onClick={handlePost} disabled={posting}>
              <CheckCircle className="h-4 w-4 mr-2" />
              {posting ? 'Memposting...' : 'Post Jurnal'}
            </Button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Tanggal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{formatDate(entry.entry_date)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Sumber</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{JOURNAL_ENTRY_SOURCE_LABELS[entry.source_type]}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Total Debit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium font-mono">{formatCurrency(entry.total_debit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Total Kredit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium font-mono">{formatCurrency(entry.total_credit)}</p>
          </CardContent>
        </Card>
      </div>

      {entry.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Catatan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{entry.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Lines table */}
      <Card>
        <CardHeader>
          <CardTitle>Baris Jurnal</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead className="w-[120px]">Kode Akun</TableHead>
                <TableHead>Nama Akun</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right w-[150px]">Debit</TableHead>
                <TableHead className="text-right w-[150px]">Kredit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entry.lines.map((line, i) => (
                <TableRow key={line.id}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {line.account?.account_code || '—'}
                  </TableCell>
                  <TableCell className="font-medium">
                    {line.account?.account_name || '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {line.description || '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {line.debit > 0 ? formatCurrency(line.debit) : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {line.credit > 0 ? formatCurrency(line.credit) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4} className="font-bold">
                  Total
                </TableCell>
                <TableCell className="text-right font-mono font-bold">
                  {formatCurrency(entry.total_debit)}
                </TableCell>
                <TableCell className="text-right font-mono font-bold">
                  {formatCurrency(entry.total_credit)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
