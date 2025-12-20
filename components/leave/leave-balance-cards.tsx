'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LeaveBalance, LeaveType } from '@/types/leave';
import { formatDays } from '@/lib/leave-utils';
import { Calendar, Briefcase, Heart, Baby, Gift, Users } from 'lucide-react';

interface LeaveBalanceCardsProps {
  balances: LeaveBalance[];
  leaveTypes: LeaveType[];
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  annual: Calendar,
  sick: Heart,
  maternity: Baby,
  paternity: Baby,
  marriage: Gift,
  bereavement: Users,
  unpaid: Briefcase,
};

export function LeaveBalanceCards({ balances, leaveTypes }: LeaveBalanceCardsProps) {
  // Create a map of balances by leave type ID
  const balanceMap = new Map(balances.map(b => [b.leave_type_id, b]));

  // Group leave types: main (annual, sick) and other
  const mainTypes = leaveTypes.filter(t => ['annual', 'sick'].includes(t.type_code));
  const otherTypes = leaveTypes.filter(t => !['annual', 'sick'].includes(t.type_code));

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Main leave type cards */}
      {mainTypes.map(leaveType => {
        const balance = balanceMap.get(leaveType.id);
        const Icon = typeIcons[leaveType.type_code] || Calendar;
        const totalEntitled = (balance?.entitled_days || 0) + (balance?.carried_over_days || 0);
        const usedPercentage = totalEntitled > 0 
          ? ((balance?.used_days || 0) / totalEntitled) * 100 
          : 0;

        return (
          <Card key={leaveType.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                {leaveType.type_name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Entitled:</span>
                    <span className="ml-2 font-medium">{formatDays(balance?.entitled_days || 0)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Used:</span>
                    <span className="ml-2 font-medium">{formatDays(balance?.used_days || 0)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pending:</span>
                    <span className="ml-2 font-medium text-yellow-600">{formatDays(balance?.pending_days || 0)}</span>
                  </div>
                  {(balance?.carried_over_days || 0) > 0 && (
                    <div>
                      <span className="text-muted-foreground">Carried:</span>
                      <span className="ml-2 font-medium text-blue-600">{formatDays(balance?.carried_over_days || 0)}</span>
                    </div>
                  )}
                </div>
                
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-muted-foreground">Available</span>
                    <span className="text-lg font-bold text-green-600">
                      {formatDays(balance?.available_days || 0)}
                    </span>
                  </div>
                  <Progress value={usedPercentage} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {usedPercentage.toFixed(0)}% used
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Other leave types card */}
      {otherTypes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              Other Leave
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {otherTypes.map(leaveType => {
                const balance = balanceMap.get(leaveType.id);
                const available = balance?.available_days || leaveType.default_days_per_year;
                
                return (
                  <div key={leaveType.id} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{leaveType.type_name.split(' ')[0]}:</span>
                    <span className="font-medium">
                      {leaveType.default_days_per_year === 0 ? 'N/A' : formatDays(available)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
