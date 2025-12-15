import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react'
import { formatIDR } from '@/lib/pjo-utils'
import { COST_CATEGORY_LABELS } from '@/lib/pjo-utils'

export default async function BudgetAlertsPage() {
  const supabase = await createClient()

  // Fetch all exceeded cost items (not limited)
  const { data: exceededItems, error } = await supabase
    .from('pjo_cost_items')
    .select(`
      id,
      pjo_id,
      category,
      description,
      estimated_amount,
      actual_amount,
      variance,
      variance_pct,
      created_at,
      proforma_job_orders(pjo_number, commodity)
    `)
    .eq('status', 'exceeded')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching exceeded items:', error)
  }

  const items = exceededItems || []
  const hasItems = items.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Budget Alerts</h2>
          <p className="text-muted-foreground">
            {hasItems
              ? `${items.length} cost items have exceeded their budget`
              : 'All cost items are within budget'}
          </p>
        </div>
      </div>

      {hasItems ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Exceeded Cost Items
            </CardTitle>
            <CardDescription>
              Click on an item to go to the cost entry page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items.map((item) => {
                const pjo = item.proforma_job_orders as { pjo_number: string; commodity: string | null } | null
                
                return (
                  <Link
                    key={item.id}
                    href={`/proforma-jo/${item.pjo_id}/costs`}
                    className="block p-4 rounded-lg border border-red-100 bg-red-50/50 hover:bg-red-100/50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{pjo?.pjo_number || 'Unknown PJO'}</p>
                          {pjo?.commodity && (
                            <span className="text-xs text-muted-foreground">
                              • {pjo.commodity}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {COST_CATEGORY_LABELS[item.category] || item.category}
                          {item.description && ` - ${item.description}`}
                        </p>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Budget: {formatIDR(item.estimated_amount)}</span>
                          <span>Actual: {formatIDR(item.actual_amount || 0)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600">
                          +{formatIDR(item.variance || 0)}
                        </p>
                        <p className="text-sm text-red-500">
                          +{(item.variance_pct || 0).toFixed(1)}% over budget
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">All Clear!</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Great news! All cost items are within their budgeted amounts.
              Keep up the good work managing project costs.
            </p>
            <Button asChild className="mt-6">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
