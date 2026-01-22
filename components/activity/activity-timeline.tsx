'use client';

import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import type { UserActivityLog } from '@/types/activity';
import {
  getResourceUrl,
  getActionTypeLabel,
  getResourceTypeLabel,
  getActionTypeBadgeColor,
} from '@/lib/user-activity-utils';

interface ActivityTimelineProps {
  activities: UserActivityLog[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No activities found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const resourceUrl = getResourceUrl(activity.resource_type, activity.resource_id);
        const relativeTime = formatDistanceToNow(new Date(activity.created_at), { addSuffix: true });

        return (
          <div
            key={activity.id}
            className="flex items-start gap-4 p-4 bg-card rounded-lg border"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm truncate">
                  {activity.user_email || 'Unknown User'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${getActionTypeBadgeColor(
                    activity.action_type
                  )}`}
                >
                  {getActionTypeLabel(activity.action_type)}
                </span>
                {activity.resource_type && (
                  <span className="text-sm text-muted-foreground">
                    {getResourceTypeLabel(activity.resource_type)}
                  </span>
                )}
              </div>

              <div className="mt-1 text-sm text-muted-foreground">
                {activity.action_type === 'page_view' ? (
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                    {activity.page_path}
                  </span>
                ) : resourceUrl ? (
                  <Link
                    href={resourceUrl}
                    className="text-primary hover:underline"
                  >
                    View {getResourceTypeLabel(activity.resource_type)} →
                  </Link>
                ) : activity.resource_id ? (
                  <span>ID: {activity.resource_id}</span>
                ) : null}
              </div>
            </div>

            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {relativeTime}
            </div>
          </div>
        );
      })}
    </div>
  );
}
