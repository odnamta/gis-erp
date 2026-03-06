'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getMySubmissions } from '@/app/actions/feedback';
import {
  getStatusVariant,
  getStatusLabel,
  getFeedbackTypeLabel,
  getSeverityColor,
  formatFeedbackDate,
} from '@/lib/feedback-utils';
import type { FeedbackListItem } from '@/types/feedback';
import { MyFeedbackDetailSheet } from './my-feedback-detail-sheet';

export function MyFeedbackList() {
  const [items, setItems] = useState<FeedbackListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackListItem | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getMySubmissions();
      if (result.success && result.data) {
        setItems(result.data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Feedback</h1>
        <p className="text-muted-foreground">
          Track the status of your submitted bug reports and improvement requests
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Your Submissions ({items.length})
          </CardTitle>
          <CardDescription>
            Click on a row to view details and add comments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>You haven&apos;t submitted any feedback yet.</p>
              <p className="text-sm mt-2">
                Use the feedback button in the bottom-right corner to report bugs or suggest improvements.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Comments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedFeedback(item)}
                  >
                    <TableCell className="font-mono text-sm">
                      {item.ticket_number}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getFeedbackTypeLabel(item.feedback_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {item.title}
                    </TableCell>
                    <TableCell>
                      {item.severity && (
                        <span className="inline-flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${getSeverityColor(item.severity)}`} />
                          <span className="capitalize">{item.severity}</span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(item.status)}>
                        {getStatusLabel(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatFeedbackDate(item.created_at)}</TableCell>
                    <TableCell>{item.comment_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <MyFeedbackDetailSheet
        feedback={selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
        onUpdate={loadData}
      />
    </div>
  );
}
