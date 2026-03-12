'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CustomerChurnRisk } from '@/types/predictive-analytics';
import { RiskBadge } from './risk-badge';
import { TrendIndicator } from './trend-indicator';
import { recordChurnAction } from '@/lib/predictive-analytics-actions';
import { Phone, Calendar, FileText, Loader2 } from 'lucide-react';

interface ChurnRiskTableProps {
  data: CustomerChurnRisk[];
  onRefresh?: () => void;
}

export function ChurnRiskTable({ data, onRefresh }: ChurnRiskTableProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (riskId: string, action: string) => {
    setActionLoading(riskId);
    try {
      await recordChurnAction(riskId, action);
      onRefresh?.();
    } catch (error) {
      console.error('Error recording action:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getActionButton = (risk: CustomerChurnRisk) => {
    if (risk.action_taken) {
      return (
        <span className="text-sm text-muted-foreground">
          ✓ {risk.action_taken}
        </span>
      );
    }

    const isLoading = actionLoading === risk.id;

    switch (risk.risk_level) {
      case 'critical':
        return (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleAction(risk.id, 'Contacted immediately')}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4 mr-1" />}
            Contact Now
          </Button>
        );
      case 'high':
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction(risk.id, 'Scheduled call')}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4 mr-1" />}
            Schedule Call
          </Button>
        );
      default:
        return (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleAction(risk.id, 'Reviewed account')}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
            Review Account
          </Button>
        );
    }
  };

  const getKeyRiskFactor = (risk: CustomerChurnRisk) => {
    if (risk.contributing_factors && risk.contributing_factors.length > 0) {
      // Sort by impact and get the highest
      const sorted = [...risk.contributing_factors].sort((a, b) => b.impact - a.impact);
      return sorted[0].factor;
    }
    return 'Unknown';
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No customers at risk. Run assessment to analyze customer churn risk.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Customer</TableHead>
          <TableHead>Risk Score</TableHead>
          <TableHead>Last Job</TableHead>
          <TableHead>Revenue Trend</TableHead>
          <TableHead>Key Risk Factor</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((risk) => (
          <TableRow key={risk.id}>
            <TableCell className="font-medium">
              {risk.customer?.name || 'Unknown Customer'}
            </TableCell>
            <TableCell>
              <RiskBadge level={risk.risk_level} score={risk.churn_risk_score} />
            </TableCell>
            <TableCell>
              {risk.days_since_last_job !== null
                ? `${risk.days_since_last_job} days ago`
                : 'Never'}
            </TableCell>
            <TableCell>
              {risk.revenue_trend && (
                <TrendIndicator trend={risk.revenue_trend} />
              )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {getKeyRiskFactor(risk)}
            </TableCell>
            <TableCell>
              {getActionButton(risk)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
