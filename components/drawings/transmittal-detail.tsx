'use client';

// Transmittal Detail Component
// Display transmittal details with actions

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import {
  DrawingTransmittalWithDetails,
  TransmittalStatus,
  PURPOSE_LABELS,
} from '@/types/drawing';
import { formatDrawingDate } from '@/lib/drawing-utils';
import { sendTransmittal, acknowledgeTransmittal } from '@/lib/drawing-actions';
import {
  ArrowLeft,
  Send,
  CheckCircle,
  Building2,
  User,
  Mail,
  Calendar,
  FileText,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TransmittalDetailProps {
  transmittal: DrawingTransmittalWithDetails;
  onRefresh: () => void;
}

const STATUS_CONFIG: Record<TransmittalStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-800' },
  acknowledged: { label: 'Acknowledged', color: 'bg-green-100 text-green-800' },
};

export function TransmittalDetail({ transmittal, onRefresh }: TransmittalDetailProps) {
  const [loading, setLoading] = useState<'send' | 'acknowledge' | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'send' | 'acknowledge' | null;
  }>({ open: false, action: null });

  const statusConfig = STATUS_CONFIG[transmittal.status];

  const handleSend = async () => {
    setLoading('send');
    setConfirmDialog({ open: false, action: null });

    try {
      const result = await sendTransmittal(transmittal.id);
      if (result.success) {
        toast.success('Transmittal sent successfully');
        onRefresh();
      } else {
        toast.error(result.error || 'Failed to send transmittal');
      }
    } catch (error) {
      console.error('Error sending transmittal:', error);
      toast.error('An error occurred');
    } finally {
      setLoading(null);
    }
  };

  const handleAcknowledge = async () => {
    setLoading('acknowledge');
    setConfirmDialog({ open: false, action: null });

    try {
      const result = await acknowledgeTransmittal(transmittal.id);
      if (result.success) {
        toast.success('Transmittal acknowledged');
        onRefresh();
      } else {
        toast.error(result.error || 'Failed to acknowledge transmittal');
      }
    } catch (error) {
      console.error('Error acknowledging transmittal:', error);
      toast.error('An error occurred');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href="/engineering/drawings/transmittals">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Transmittals
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono">
              {transmittal.transmittal_number}
            </h1>
            <Badge className={cn(statusConfig.color)}>{statusConfig.label}</Badge>
          </div>
          <p className="text-lg text-muted-foreground">
            {PURPOSE_LABELS[transmittal.purpose]}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {transmittal.status === 'draft' && (
            <Button
              onClick={() => setConfirmDialog({ open: true, action: 'send' })}
              disabled={loading !== null}
            >
              {loading === 'send' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Transmittal
            </Button>
          )}
          {transmittal.status === 'sent' && (
            <Button
              onClick={() => setConfirmDialog({ open: true, action: 'acknowledge' })}
              disabled={loading !== null}
            >
              {loading === 'acknowledge' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Mark Acknowledged
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Drawings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Included Drawings ({transmittal.drawings?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transmittal.drawings && transmittal.drawings.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Drawing No.</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Revision</TableHead>
                        <TableHead className="text-right">Copies</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transmittal.drawings.map((drawing, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono font-medium">
                            <Link
                              href={`/engineering/drawings/${drawing.drawing_id}`}
                              className="hover:underline text-primary"
                            >
                              {drawing.drawing_number}
                            </Link>
                          </TableCell>
                          <TableCell>{drawing.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{drawing.revision}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{drawing.copies}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground">No drawings included.</p>
              )}
            </CardContent>
          </Card>

          {/* Cover Letter */}
          {transmittal.cover_letter && (
            <Card>
              <CardHeader>
                <CardTitle>Cover Letter</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{transmittal.cover_letter}</p>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {transmittal.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {transmittal.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recipient */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recipient</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{transmittal.recipient_company}</p>
                </div>
              </div>
              {transmittal.recipient_name && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{transmittal.recipient_name}</span>
                </div>
              )}
              {transmittal.recipient_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${transmittal.recipient_email}`}
                    className="text-primary hover:underline"
                  >
                    {transmittal.recipient_email}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Created
                </span>
                <span>{formatDrawingDate(transmittal.created_at)}</span>
              </div>
              {transmittal.sent_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Sent</span>
                  <span>{formatDrawingDate(transmittal.sent_at)}</span>
                </div>
              )}
              {transmittal.acknowledged_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Acknowledged</span>
                  <span>{formatDrawingDate(transmittal.acknowledged_at)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Project */}
          {transmittal.project && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Project</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{transmittal.project.name}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Confirm Dialogs */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ open, action: open ? confirmDialog.action : null })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === 'send'
                ? 'Send Transmittal'
                : 'Acknowledge Transmittal'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === 'send'
                ? 'This will mark the transmittal as sent. The recipient should receive the drawings.'
                : 'This will mark the transmittal as acknowledged by the recipient.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={
                confirmDialog.action === 'send' ? handleSend : handleAcknowledge
              }
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
