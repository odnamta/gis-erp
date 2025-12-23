'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ResourceTypeBadge,
  AvailabilityBadge,
  AssignmentStatusBadge,
} from '@/components/ui/resource-status-badge'
import { ResourceWithDetails, ResourceAssignment } from '@/types/resource-scheduling'
import { formatDate } from '@/lib/pjo-utils'
import { getCertificationStatus } from '@/lib/resource-scheduling-utils'
import {
  Pencil,
  MapPin,
  Clock,
  DollarSign,
  User,
  Package,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Briefcase,
} from 'lucide-react'

interface ResourceDetailProps {
  resource: ResourceWithDetails
}

export function ResourceDetail({ resource }: ResourceDetailProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{resource.resource_name}</h1>
            <ResourceTypeBadge type={resource.resource_type} />
            <AvailabilityBadge isAvailable={resource.is_available} />
          </div>
          <p className="text-muted-foreground font-mono">{resource.resource_code}</p>
        </div>
        <Button asChild>
          <Link href={`/engineering/resources/${resource.id}/edit`}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {resource.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{resource.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Linked Entity */}
          {(resource.employee || resource.asset) && (
            <Card>
              <CardHeader>
                <CardTitle>Linked Entity</CardTitle>
              </CardHeader>
              <CardContent>
                {resource.employee && (
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{resource.employee.full_name}</p>
                      <p className="text-sm text-muted-foreground">{resource.employee.position}</p>
                    </div>
                  </div>
                )}
                {resource.asset && (
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{resource.asset.asset_name}</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {resource.asset.asset_code}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Skills */}
          {resource.skills && resource.skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {resource.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Certifications */}
          {resource.certifications && resource.certifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Certifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {resource.certifications.map((cert, index) => {
                    const status = cert.expiry_date
                      ? getCertificationStatus(cert.expiry_date)
                      : 'valid'
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{cert.name}</p>
                          {cert.issuing_body && (
                            <p className="text-sm text-muted-foreground">{cert.issuing_body}</p>
                          )}
                        </div>
                        <div className="text-right">
                          {cert.expiry_date && (
                            <div className="flex items-center gap-2">
                              {status === 'expired' && (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Expired
                                </Badge>
                              )}
                              {status === 'expiring_soon' && (
                                <Badge
                                  variant="secondary"
                                  className="bg-yellow-100 text-yellow-800 gap-1"
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  Expiring Soon
                                </Badge>
                              )}
                              {status === 'valid' && (
                                <Badge
                                  variant="secondary"
                                  className="bg-green-100 text-green-800 gap-1"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  Valid
                                </Badge>
                              )}
                              <span className="text-sm text-muted-foreground">
                                {formatDate(cert.expiry_date)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Assignments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Current Assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {resource.current_assignments && resource.current_assignments.length > 0 ? (
                <div className="space-y-3">
                  {resource.current_assignments.map((assignment) => (
                    <AssignmentCard key={assignment.id} assignment={assignment} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No current assignments</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Capacity & Rates */}
          <Card>
            <CardHeader>
              <CardTitle>Capacity & Rates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Daily Capacity</p>
                  <p className="font-medium">{resource.daily_capacity} hours</p>
                </div>
              </div>

              {resource.hourly_rate && (
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Hourly Rate</p>
                    <p className="font-medium">{formatCurrency(resource.hourly_rate)}</p>
                  </div>
                </div>
              )}

              {resource.daily_rate && (
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Daily Rate</p>
                    <p className="font-medium">{formatCurrency(resource.daily_rate)}</p>
                  </div>
                </div>
              )}

              {resource.base_location && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Base Location</p>
                    <p className="font-medium">{resource.base_location}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Unavailability Info */}
          {!resource.is_available && (
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Unavailable</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {resource.unavailable_reason && (
                  <p className="text-sm">{resource.unavailable_reason}</p>
                )}
                {resource.unavailable_until && (
                  <p className="text-sm text-muted-foreground">
                    Available from: {formatDate(resource.unavailable_until)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(resource.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{formatDate(resource.updated_at)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function AssignmentCard({ assignment }: { assignment: ResourceAssignment }) {
  return (
    <div className="p-3 border rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <AssignmentStatusBadge status={assignment.status} />
        <span className="text-sm text-muted-foreground">
          {formatDate(assignment.start_date)} - {formatDate(assignment.end_date)}
        </span>
      </div>
      {assignment.task_description && (
        <p className="text-sm mb-2">{assignment.task_description}</p>
      )}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {assignment.planned_hours && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {assignment.planned_hours}h planned
          </span>
        )}
        {assignment.work_location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {assignment.work_location}
          </span>
        )}
      </div>
    </div>
  )
}
