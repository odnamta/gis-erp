import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginClient } from './login-client'

// Force static generation
export const dynamic = 'force-static'

// Server Component - renders immediately for better LCP
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
            G
          </div>
          <CardTitle className="text-2xl">Gama ERP</CardTitle>
          <CardDescription>
            Logistics Management System
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LoginClient />
          <p className="text-center text-sm text-muted-foreground">
            Only authorized @gama-group.co accounts can access this system.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
