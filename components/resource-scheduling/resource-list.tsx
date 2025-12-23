'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ResourceTypeBadge, AvailabilityBadge } from '@/components/ui/resource-status-badge'
import { EngineeringResource, ResourceType, RESOURCE_TYPE_LABELS } from '@/types/resource-scheduling'
import { deleteResource } from '@/lib/resource-scheduling-actions'
import { Search, MoreHorizontal, Pencil, Trash2, Eye, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface ResourceListProps {
  resources: EngineeringResource[]
  showActions?: boolean
}

export function ResourceList({ resources, showActions = true }: ResourceListProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all')

  const filteredResources = resources.filter((resource) => {
    const matchesSearch =
      search === '' ||
      resource.resource_name.toLowerCase().includes(search.toLowerCase()) ||
      resource.resource_code.toLowerCase().includes(search.toLowerCase())

    const matchesType = typeFilter === 'all' || resource.resource_type === typeFilter
    const matchesAvailability =
      availabilityFilter === 'all' ||
      (availabilityFilter === 'available' && resource.is_available) ||
      (availabilityFilter === 'unavailable' && !resource.is_available)

    return matchesSearch && matchesType && matchesAvailability
  })

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return

    try {
      await deleteResource(id)
      toast.success('Resource deleted successfully')
      router.refresh()
    } catch (error) {
      toast.error('Failed to delete resource')
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(RESOURCE_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="unavailable">Unavailable</SelectItem>
          </SelectContent>
        </Select>
        {showActions && (
          <Button asChild>
            <Link href="/engineering/resources/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Resource
            </Link>
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Skills</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Status</TableHead>
              {showActions && <TableHead className="w-[70px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredResources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showActions ? 7 : 6} className="text-center py-8 text-muted-foreground">
                  No resources found
                </TableCell>
              </TableRow>
            ) : (
              filteredResources.map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell className="font-mono text-sm">{resource.resource_code}</TableCell>
                  <TableCell className="font-medium">{resource.resource_name}</TableCell>
                  <TableCell>
                    <ResourceTypeBadge type={resource.resource_type} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(resource.skills || []).slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          className="text-xs bg-muted px-2 py-0.5 rounded"
                        >
                          {skill}
                        </span>
                      ))}
                      {(resource.skills || []).length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{resource.skills.length - 3}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{resource.daily_capacity}h/day</TableCell>
                  <TableCell>
                    <AvailabilityBadge isAvailable={resource.is_available} />
                  </TableCell>
                  {showActions && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/engineering/resources/${resource.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/engineering/resources/${resource.id}/edit`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(resource.id, resource.resource_name)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
