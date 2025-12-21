'use client';

// =====================================================
// v0.36: ONBOARDING STEP CARD COMPONENT
// =====================================================

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OnboardingStepCardProps } from '@/types/onboarding';
import { formatPoints } from '@/lib/onboarding-utils';
import { format } from 'date-fns';
import {
  CheckCircle2,
  Circle,
  Loader2,
  SkipForward,
  ChevronRight,
} from 'lucide-react';

export function OnboardingStepCard({
  progress,
  onAction,
  showPoints = true,
}: OnboardingStepCardProps) {
  const router = useRouter();
  const { step, status, completed_at, current_count } = progress;

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (step.action_route) {
      router.push(step.action_route);
    }
  };

  const renderStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'skipped':
        return <SkipForward className="h-5 w-5 text-gray-400" />;
      default:
        return <Circle className="h-5 w-5 text-gray-300" />;
    }
  };

  const isActionable = status === 'pending' || status === 'in_progress';

  return (
    <Card className={`transition-colors ${status === 'completed' ? 'bg-green-50/50 border-green-200' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{renderStatusIcon()}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className={`font-medium ${status === 'completed' ? 'text-green-800' : ''}`}>
                {step.step_name}
              </h4>
              {showPoints && step.points > 0 && (
                <Badge variant={status === 'completed' ? 'default' : 'secondary'} className="shrink-0">
                  {formatPoints(step.points)}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {step.description}
            </p>
            {status === 'completed' && completed_at && (
              <p className="text-xs text-green-600 mt-2">
                Completed on {format(new Date(completed_at), 'MMM d, yyyy')}
              </p>
            )}
            {status === 'in_progress' && step.completion_type === 'auto_count' && (
              <p className="text-xs text-blue-600 mt-2">
                Progress: {current_count}/{step.completion_count}
              </p>
            )}
            {isActionable && step.action_label && step.action_route && (
              <Button
                variant="link"
                size="sm"
                className="mt-2 p-0 h-auto"
                onClick={handleAction}
              >
                {step.action_label}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
