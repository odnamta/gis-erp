'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ShipmentTracking,
  MilestoneProgress,
  TrackingEventType,
  TRACKING_EVENT_TYPE_LABELS,
  TRACKING_EVENT_TYPE_COLORS,
  TRACKING_EVENT_TYPES,
} from '@/types/agency';
import { calculateMilestoneProgress } from '@/lib/vessel-tracking-utils';
import {
  Package,
  ArrowRight,
  Ship,
  MapPin,
  CheckCircle2,
  Circle,
  Truck,
  Warehouse,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrackingProgressProps {
  events: ShipmentTracking[];
  title?: string;
  showHeader?: boolean;
  className?: string;
}

/**
 * Visual milestone progress bar for shipment tracking.
 * Shows completed and pending milestones.
 * 
 * **Requirements: 5.4**
 */
export function TrackingProgress({
  events,
  title = 'Shipment Progress',
  showHeader = true,
  className,
}: TrackingProgressProps) {
  const progress = calculateMilestoneProgress(events);

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{title}</CardTitle>
            <Badge variant="secondary">{progress.progressPercent}% Complete</Badge>
          </div>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <Progress value={progress.progressPercent} className="h-2" />

        {/* Milestone Steps */}
        <MilestoneSteps progress={progress} />

        {/* Current Status */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Current Status:</span>
          <Badge className={TRACKING_EVENT_TYPE_COLORS[progress.currentMilestone]}>
            {TRACKING_EVENT_TYPE_LABELS[progress.currentMilestone]}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Milestone steps visualization
 */
interface MilestoneStepsProps {
  progress: MilestoneProgress;
  className?: string;
}

export function MilestoneSteps({ progress, className }: MilestoneStepsProps) {
  // Get icon for milestone
  const getMilestoneIcon = (milestone: TrackingEventType, isCompleted: boolean, isCurrent: boolean) => {
    const iconClass = cn(
      'h-4 w-4',
      isCompleted ? 'text-primary' : isCurrent ? 'text-primary' : 'text-muted-foreground/50'
    );

    switch (milestone) {
      case 'booked':
        return <Package className={iconClass} />;
      case 'gate_in':
        return <ArrowRight className={iconClass} />;
      case 'loaded':
        return <Ship className={iconClass} />;
      case 'departed':
        return <Ship className={iconClass} />;
      case 'transshipment':
        return <Warehouse className={iconClass} />;
      case 'arrived':
        return <MapPin className={iconClass} />;
      case 'discharged':
        return <Ship className={iconClass} />;
      case 'gate_out':
        return <ArrowRight className={iconClass} />;
      case 'delivered':
        return <Truck className={iconClass} />;
      default:
        return <Circle className={iconClass} />;
    }
  };

  return (
    <div className={cn('overflow-x-auto', className)}>
      <div className="flex items-center justify-between min-w-max py-2">
        {TRACKING_EVENT_TYPES.map((milestone, index) => {
          const isCompleted = progress.completedMilestones.includes(milestone);
          const isCurrent = progress.currentMilestone === milestone;
          const _isPending = progress.pendingMilestones.includes(milestone);

          return (
            <div key={milestone} className="flex items-center">
              {/* Milestone node */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors',
                    isCompleted
                      ? 'bg-primary text-primary-foreground border-primary'
                      : isCurrent
                      ? 'bg-primary/20 text-primary border-primary'
                      : 'bg-muted text-muted-foreground border-muted-foreground/30'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    getMilestoneIcon(milestone, isCompleted, isCurrent)
                  )}
                </div>
                <span
                  className={cn(
                    'mt-1 text-xs text-center max-w-[60px] truncate',
                    isCompleted || isCurrent ? 'font-medium' : 'text-muted-foreground'
                  )}
                >
                  {TRACKING_EVENT_TYPE_LABELS[milestone]}
                </span>
              </div>

              {/* Connector line */}
              {index < TRACKING_EVENT_TYPES.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-6 mx-1',
                    isCompleted ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Compact progress indicator for list views
 */
interface CompactProgressProps {
  events: ShipmentTracking[];
  className?: string;
}

export function CompactProgress({ events, className }: CompactProgressProps) {
  const progress = calculateMilestoneProgress(events);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Progress value={progress.progressPercent} className="h-1.5 flex-1" />
      <span className="text-xs text-muted-foreground shrink-0">
        {progress.progressPercent}%
      </span>
    </div>
  );
}

/**
 * Progress summary with milestone counts
 */
interface ProgressSummaryProps {
  events: ShipmentTracking[];
  className?: string;
}

export function ProgressSummary({ events, className }: ProgressSummaryProps) {
  const progress = calculateMilestoneProgress(events);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Progress</span>
        <span className="font-medium">{progress.progressPercent}%</span>
      </div>
      <Progress value={progress.progressPercent} className="h-2" />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{progress.completedMilestones.length} completed</span>
        <span>{progress.pendingMilestones.length} remaining</span>
      </div>
    </div>
  );
}

/**
 * Vertical progress steps for sidebar/detail views
 */
interface VerticalProgressProps {
  events: ShipmentTracking[];
  className?: string;
}

export function VerticalProgress({ events, className }: VerticalProgressProps) {
  const progress = calculateMilestoneProgress(events);

  return (
    <div className={cn('space-y-0', className)}>
      {TRACKING_EVENT_TYPES.map((milestone, index) => {
        const isCompleted = progress.completedMilestones.includes(milestone);
        const isCurrent = progress.currentMilestone === milestone;
        const isLast = index === TRACKING_EVENT_TYPES.length - 1;

        return (
          <div key={milestone} className="relative flex gap-3">
            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  'absolute left-[11px] top-6 bottom-0 w-0.5',
                  isCompleted ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              />
            )}

            {/* Node */}
            <div
              className={cn(
                'relative z-10 h-6 w-6 rounded-full flex items-center justify-center border-2 shrink-0',
                isCompleted
                  ? 'bg-primary text-primary-foreground border-primary'
                  : isCurrent
                  ? 'bg-primary/20 text-primary border-primary'
                  : 'bg-background text-muted-foreground border-muted-foreground/30'
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
            </div>

            {/* Label */}
            <div className="pb-4">
              <p
                className={cn(
                  'text-sm',
                  isCompleted || isCurrent ? 'font-medium' : 'text-muted-foreground'
                )}
              >
                {TRACKING_EVENT_TYPE_LABELS[milestone]}
              </p>
              {isCurrent && (
                <Badge variant="outline" className="text-xs mt-1">
                  Current
                </Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Progress ring/circle visualization
 */
interface ProgressRingProps {
  events: ShipmentTracking[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProgressRing({ events, size = 'md', className }: ProgressRingProps) {
  const progress = calculateMilestoneProgress(events);
  
  const sizeConfig = {
    sm: { size: 48, stroke: 4, fontSize: 'text-xs' },
    md: { size: 64, stroke: 6, fontSize: 'text-sm' },
    lg: { size: 96, stroke: 8, fontSize: 'text-lg' },
  };

  const config = sizeConfig[size];
  const radius = (config.size - config.stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress.progressPercent / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={config.size} height={config.size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.stroke}
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-all duration-500"
        />
      </svg>
      <span className={cn('absolute font-medium', config.fontSize)}>
        {progress.progressPercent}%
      </span>
    </div>
  );
}
