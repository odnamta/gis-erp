'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'

export interface ManpowerItem {
  id: string
  fullName: string
  role: string
  isActive: boolean
  currentAssignment: string | null
}

interface ManpowerListProps {
  members: ManpowerItem[]
}

function formatRoleLabel(role: string): string {
  return role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function ManpowerList({ members }: ManpowerListProps) {
  if (members.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Tim Operasional
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Belum ada anggota tim operasional.
          </p>
        </CardContent>
      </Card>
    )
  }

  const activeCount = members.filter(m => m.isActive).length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Tim Operasional
          </span>
          <Badge variant="secondary" className="text-xs">
            {activeCount}/{members.length} aktif
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between gap-4 rounded-lg border p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {member.fullName}
                  </span>
                  <Badge
                    variant={member.isActive ? 'default' : 'secondary'}
                    className="text-xs shrink-0"
                  >
                    {member.isActive ? 'Aktif' : 'Tidak Aktif'}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatRoleLabel(member.role)}
                </span>
              </div>
              <div className="text-right shrink-0">
                {member.currentAssignment ? (
                  <span className="text-xs text-muted-foreground">
                    {member.currentAssignment}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    Belum ditugaskan
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
