'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Customer } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Pencil, Eye, Search, Trash2, MoreHorizontal, Cake } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useIsDesktop } from '@/hooks/use-media-query'

interface CustomerTableProps {
  customers: Customer[]
  onEdit: (customer: Customer) => void
  onDelete: (customer: Customer) => void
}

export function filterCustomersByName(customers: Customer[], searchTerm: string): Customer[] {
  if (!searchTerm.trim()) return customers
  const term = searchTerm.toLowerCase()
  return customers.filter(c => c.name.toLowerCase().includes(term))
}

function getDaysUntilAnniversary(customer: Customer): number | null {
  const estDate = (customer as any).established_date
  if (!estDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const established = new Date(estDate)
  const anniversaryThisYear = new Date(
    today.getFullYear(),
    established.getMonth(),
    established.getDate()
  )
  const nextAnniversary =
    anniversaryThisYear >= today
      ? anniversaryThisYear
      : new Date(
          today.getFullYear() + 1,
          established.getMonth(),
          established.getDate()
        )
  return Math.ceil(
    (nextAnniversary.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )
}

function AnniversaryBadge({ customer }: { customer: Customer }) {
  const days = getDaysUntilAnniversary(customer)
  if (days === null || days > 30) return null
  return (
    <Badge variant="warning" className="ml-2 gap-1 text-[10px] px-1.5 py-0">
      <Cake className="h-3 w-3" />
      {days === 0 ? 'Hari ini!' : `${days}hr`}
    </Badge>
  )
}

export function CustomerTable({ customers, onEdit, onDelete }: CustomerTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const isDesktop = useIsDesktop()

  const filteredCustomers = filterCustomersByName(customers, searchTerm)

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search customers by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="rounded-md border p-6 text-center text-muted-foreground">
          {searchTerm ? 'No customers match your search.' : 'No customers found. Add your first customer to get started.'}
        </div>
      ) : !isDesktop ? (
        /* Mobile card view */
        <div className="space-y-3">
          {filteredCustomers.map((customer) => (
            <div key={customer.id} className="rounded-lg border bg-card p-4 space-y-1.5 active:bg-muted/50">
              <div className="flex items-start justify-between gap-2">
                <span className="flex items-center">
                  <Link href={`/customers/${customer.id}`} className="font-medium text-sm hover:underline">
                    {customer.name}
                  </Link>
                  <AnniversaryBadge customer={customer} />
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/customers/${customer.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(customer)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(customer)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {customer.email && (
                <div className="text-xs text-muted-foreground">{customer.email}</div>
              )}
              {customer.phone && (
                <div className="text-xs text-muted-foreground">{customer.phone}</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Desktop table view */
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">
                    <span className="flex items-center">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="hover:underline"
                      >
                        {customer.name}
                      </Link>
                      <AnniversaryBadge customer={customer} />
                    </span>
                  </TableCell>
                  <TableCell>{customer.email || '-'}</TableCell>
                  <TableCell>{customer.phone || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(customer)}
                        title="Edit customer"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        title="View customer"
                      >
                        <Link href={`/customers/${customer.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(customer)}
                        title="Delete customer"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
