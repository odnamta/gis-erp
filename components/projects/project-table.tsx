'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Customer, Project } from '@/types'
import { Button } from '@/components/ui/button'
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
import { StatusBadge, ProjectStatus } from '@/components/ui/status-badge'
import { Pencil, Eye, Trash2 } from 'lucide-react'

export type ProjectWithCustomer = Project & {
  customers: { name: string } | null
}

interface ProjectTableProps {
  projects: ProjectWithCustomer[]
  customers: Customer[]
  onEdit: (project: ProjectWithCustomer) => void
  onDelete: (project: ProjectWithCustomer) => void
}

export function filterProjectsByStatus(
  projects: ProjectWithCustomer[],
  status: string | null
): ProjectWithCustomer[] {
  if (!status || status === 'all') return projects
  return projects.filter((p) => p.status === status)
}

export function filterProjectsByCustomer(
  projects: ProjectWithCustomer[],
  customerId: string | null
): ProjectWithCustomer[] {
  if (!customerId || customerId === 'all') return projects
  return projects.filter((p) => p.customer_id === customerId)
}

export function filterProjects(
  projects: ProjectWithCustomer[],
  statusFilter: string | null,
  customerFilter: string | null
): ProjectWithCustomer[] {
  let filtered = projects
  filtered = filterProjectsByStatus(filtered, statusFilter)
  filtered = filterProjectsByCustomer(filtered, customerFilter)
  return filtered
}

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function ProjectTable({ projects, customers, onEdit, onDelete }: ProjectTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [customerFilter, setCustomerFilter] = useState<string>('all')

  const filteredProjects = filterProjects(projects, statusFilter, customerFilter)

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project Name</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Site Address</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {statusFilter !== 'all' || customerFilter !== 'all'
                    ? 'No projects match your filters.'
                    : 'No projects found. Add your first project to get started.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/projects/${project.id}`}
                      className="hover:underline"
                    >
                      {project.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/customers/${project.customer_id}`}
                      className="hover:underline"
                    >
                      {project.customers?.name || '-'}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={project.status as ProjectStatus} />
                  </TableCell>
                  <TableCell>{project.description || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(project)}
                        title="Edit project"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        title="View project"
                      >
                        <Link href={`/projects/${project.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(project)}
                        title="Delete project"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
