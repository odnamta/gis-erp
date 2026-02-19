import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isExplorerMode } from '@/lib/auth-utils'
import { ExplorerReadOnlyBanner } from '@/components/layout/explorer-read-only-banner'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Building2, 
  Users, 
  Activity, 
  Zap, 
  FileText, 
  Bell, 
  Link2,
  Settings2,
  Eye,
  ScrollText
} from 'lucide-react'
import Link from 'next/link'
import { UserRole } from '@/types/permissions'

// Role categories for access control
const ADMIN_ROLES: UserRole[] = ['owner', 'director', 'sysadmin']
const MANAGER_ROLES: UserRole[] = ['marketing_manager', 'finance_manager', 'operations_manager']

export default async function SettingsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()
  
  const userRole = (profile?.role || 'ops') as UserRole
  const isAdmin = ADMIN_ROLES.includes(userRole)
  const isManager = MANAGER_ROLES.includes(userRole)

  // Regular users shouldn't access Settings page - redirect to dashboard
  const isExplorer = await isExplorerMode()
  const explorerReadOnly = !isAdmin && !isManager && isExplorer
  if (!isAdmin && !isManager && !isExplorer) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-8">
      {explorerReadOnly && <ExplorerReadOnlyBanner />}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          {isAdmin ? 'System configuration and administration' : 'Department settings'}
        </p>
      </div>

      {/* Manager Settings - Available to managers */}
      {isManager && !isAdmin && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-muted-foreground">Department</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/settings/document-templates">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Document Templates</CardTitle>
                  </div>
                  <CardDescription>
                    View document generation templates
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/settings/activity-log">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Activity Log</CardTitle>
                  </div>
                  <CardDescription>
                    View department activity and changes
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>
      )}

      {/* Admin Settings - Full access for owner, director, sysadmin */}
      {isAdmin && (
        <>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-muted-foreground">Company</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Link href="/settings/company">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Company Settings</CardTitle>
                    </div>
                    <CardDescription>
                      Company information, invoice defaults, document numbering
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/settings/users">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">User Management</CardTitle>
                    </div>
                    <CardDescription>
                      Manage user accounts, roles, and permissions
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/finance/settings/overhead">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <ScrollText className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Overhead Allocation</CardTitle>
                    </div>
                    <CardDescription>
                      Configure overhead cost allocation rules
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-muted-foreground">Templates & Notifications</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Link href="/settings/document-templates">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Document Templates</CardTitle>
                    </div>
                    <CardDescription>
                      Manage document generation templates
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/settings/notification-templates">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Bell className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Notification Templates</CardTitle>
                    </div>
                    <CardDescription>
                      Configure notification templates and alerts
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-muted-foreground">System</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Link href="/settings/automation/scheduled-tasks">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Scheduled Tasks</CardTitle>
                    </div>
                    <CardDescription>
                      Manage automated tasks and execution history
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/settings/integrations">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Link2 className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Integrations</CardTitle>
                    </div>
                    <CardDescription>
                      External system integrations and sync settings
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/settings/activity-log">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Activity Log</CardTitle>
                    </div>
                    <CardDescription>
                      View all system activity and audit trail
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/settings/audit-logs">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Settings2 className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Audit Logs</CardTitle>
                    </div>
                    <CardDescription>
                      Detailed system audit logs and security events
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
