'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PPEReplacementDue, PPEInventory, EmployeeComplianceSummary } from '@/types/ppe';
import { formatPPEDate } from '@/lib/ppe-utils';
import {
  AlertTriangle,
  Package,
  Users,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

interface PPEAlertsListProps {
  overdueReplacements: PPEReplacementDue[];
  lowStockItems: PPEInventory[];
  nonCompliantEmployees: EmployeeComplianceSummary[];
}

export function PPEAlertsList({
  overdueReplacements,
  lowStockItems,
  nonCompliantEmployees,
}: PPEAlertsListProps) {
  const hasAlerts =
    overdueReplacements.length > 0 ||
    lowStockItems.length > 0 ||
    nonCompliantEmployees.length > 0;

  if (!hasAlerts) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <CheckCircle2 className="mx-auto h-12 w-12 mb-4 text-green-500" />
            <h3 className="text-lg font-medium text-foreground">All Clear!</h3>
            <p className="mt-1">No PPE alerts at this time.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {overdueReplacements.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <CardTitle className="text-base">Overdue Replacements</CardTitle>
              </div>
              <Badge variant="destructive">{overdueReplacements.length}</Badge>
            </div>
            <CardDescription>
              PPE items that have exceeded their replacement date
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdueReplacements.slice(0, 5).map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <div className="font-medium">{item.full_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.ppe_name} - Due: {formatPPEDate(item.expected_replacement_date)}
                  </div>
                </div>
                <Badge variant="destructive">{item.days_overdue} days overdue</Badge>
              </div>
            ))}
            {overdueReplacements.length > 5 && (
              <Button variant="link" asChild className="p-0">
                <Link href="/hse/ppe/replacement">
                  View all {overdueReplacements.length} items
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {nonCompliantEmployees.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-red-600" />
                <CardTitle className="text-base">Non-Compliant Employees</CardTitle>
              </div>
              <Badge variant="destructive">{nonCompliantEmployees.length}</Badge>
            </div>
            <CardDescription>
              Employees missing mandatory PPE or with overdue items
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {nonCompliantEmployees.slice(0, 5).map(emp => (
              <div
                key={emp.employeeId}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="font-medium">{emp.employeeName}</div>
                <div className="flex gap-2">
                  {emp.missing > 0 && (
                    <Badge variant="destructive">{emp.missing} missing</Badge>
                  )}
                  {emp.overdue > 0 && (
                    <Badge variant="destructive">{emp.overdue} overdue</Badge>
                  )}
                </div>
              </div>
            ))}
            {nonCompliantEmployees.length > 5 && (
              <Button variant="link" asChild className="p-0">
                <Link href="/hse/ppe/compliance">
                  View all {nonCompliantEmployees.length} employees
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {lowStockItems.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-base">Low Stock Items</CardTitle>
              </div>
              <Badge className="bg-orange-100 text-orange-800">
                {lowStockItems.length}
              </Badge>
            </div>
            <CardDescription>
              Inventory items below reorder level
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {lowStockItems.slice(0, 5).map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <div className="font-medium">{item.ppe_type?.ppe_name}</div>
                  {item.size && (
                    <div className="text-sm text-muted-foreground">Size: {item.size}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-mono">
                    {item.quantity_in_stock} / {item.reorder_level}
                  </div>
                  <div className="text-xs text-muted-foreground">in stock / reorder</div>
                </div>
              </div>
            ))}
            {lowStockItems.length > 5 && (
              <Button variant="link" asChild className="p-0">
                <Link href="/hse/ppe/inventory">
                  View all {lowStockItems.length} items
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
