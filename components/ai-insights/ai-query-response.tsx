'use client';

import { useState } from 'react';
import {
  ThumbsUp,
  ThumbsDown,
  Download,
  Mail,
  MessageSquare,
  BarChart3,
  Table2,
  Hash,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import type { AIQueryResponse } from '@/types/ai-insights';
import { exportToCSV, formatValue } from '@/lib/ai-insights-utils';

interface AIQueryResponseProps {
  response: AIQueryResponse;
  onFeedback: (helpful: boolean, notes?: string) => void;
}

export function AIQueryResponseDisplay({ response, onFeedback }: AIQueryResponseProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackNotes, setFeedbackNotes] = useState('');

  const handleFeedback = (helpful: boolean) => {
    if (helpful) {
      onFeedback(true);
      setFeedbackGiven(true);
    } else {
      setShowFeedbackDialog(true);
    }
  };

  const submitNegativeFeedback = () => {
    onFeedback(false, feedbackNotes);
    setFeedbackGiven(false);
    setShowFeedbackDialog(false);
    setFeedbackNotes('');
  };

  const handleExport = () => {
    if (!response.data || !Array.isArray(response.data)) return;
    
    const csv = exportToCSV(response.data as Record<string, unknown>[]);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-insights-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getResponseIcon = () => {
    switch (response.responseType) {
      case 'number':
        return <Hash className="h-5 w-5 text-blue-600" />;
      case 'table':
        return <Table2 className="h-5 w-5 text-green-600" />;
      case 'chart':
        return <BarChart3 className="h-5 w-5 text-purple-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <MessageSquare className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getResponseIcon()}
              <CardTitle className="text-lg">Response</CardTitle>
            </div>
            {response.executionTimeMs && (
              <span className="text-xs text-muted-foreground">
                {response.executionTimeMs}ms
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Response Text */}
          <p className={response.responseType === 'error' ? 'text-red-600' : ''}>
            {response.responseText}
          </p>

          {/* Number Response */}
          {response.responseType === 'number' && response.data !== undefined && (
            <div className="text-4xl font-bold text-blue-600">
              {typeof response.data === 'number'
                ? response.data.toLocaleString('id-ID')
                : String(response.data)}
            </div>
          )}

          {/* Table Response */}
          {response.responseType === 'table' && Array.isArray(response.data) && (
            <div className="rounded-md border overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(response.data[0] || {}).map((key) => (
                      <TableHead key={key} className="capitalize">
                        {key.replace(/_/g, ' ')}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {response.data.map((row, i) => (
                    <TableRow key={i}>
                      {Object.entries(row as Record<string, unknown>).map(([key, value], j) => (
                        <TableCell key={j}>{formatValue(key, value)}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Chart Response */}
          {response.responseType === 'chart' && response.chartConfig && (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={response.chartConfig.data}>
                  <XAxis dataKey={response.chartConfig.xKey} />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey={response.chartConfig.yKey}
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Suggestions for errors */}
          {response.responseType === 'error' && response.suggestions && (
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Try asking:</p>
              <ul className="space-y-1">
                {response.suggestions.map((suggestion, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    • {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          {response.responseType !== 'error' && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button
                variant={feedbackGiven === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFeedback(true)}
                disabled={feedbackGiven !== null}
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                Helpful
              </Button>
              <Button
                variant={feedbackGiven === false ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => handleFeedback(false)}
                disabled={feedbackGiven !== null}
              >
                <ThumbsDown className="h-4 w-4 mr-1" />
                Not Helpful
              </Button>
              
              {(response.responseType === 'table' || response.responseType === 'chart') && (
                <>
                  <div className="flex-1" />
                  <Button variant="outline" size="sm" onClick={handleExport}>
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    <Mail className="h-4 w-4 mr-1" />
                    Email
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Help us improve</DialogTitle>
            <DialogDescription>
              What could have been better about this response?
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={feedbackNotes}
            onChange={(e) => setFeedbackNotes(e.target.value)}
            placeholder="The response didn't answer my question because..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>
              Cancel
            </Button>
            <Button onClick={submitNegativeFeedback}>Submit Feedback</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
