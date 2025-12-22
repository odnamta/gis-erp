'use client';

// Drawing Detail View Component
// Displays drawing details with tabs for revisions and transmittals

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { RevisionHistory } from './revision-history';
import { RevisionForm } from './revision-form';
import { WorkflowActions } from './workflow-actions';
import {
  DrawingWithDetails,
  DrawingRevisionWithDetails,
  STATUS_LABELS,
} from '@/types/drawing';
import { getStatusColor, formatDrawingDate, formatFileSize } from '@/lib/drawing-utils';
import { getDrawingRevisions } from '@/lib/drawing-actions';
import {
  ArrowLeft,
  Edit,
  Plus,
  FileText,
  Download,
  ExternalLink,
  Calendar,
  User,
  Ruler,
  FileType,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrawingDetailViewProps {
  drawing: DrawingWithDetails;
  onRefresh: () => void;
}

export function DrawingDetailView({ drawing, onRefresh }: DrawingDetailViewProps) {
  const [revisions, setRevisions] = useState<DrawingRevisionWithDetails[]>([]);
  const [revisionFormOpen, setRevisionFormOpen] = useState(false);
  const [loadingRevisions, setLoadingRevisions] = useState(true);

  useEffect(() => {
    loadRevisions();
  }, [drawing.id]);

  const loadRevisions = async () => {
    setLoadingRevisions(true);
    try {
      const data = await getDrawingRevisions(drawing.id);
      setRevisions(data);
    } catch (error) {
      console.error('Error loading revisions:', error);
    } finally {
      setLoadingRevisions(false);
    }
  };

  const handleRevisionSuccess = () => {
    loadRevisions();
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href="/engineering/drawings">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Drawings
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono">{drawing.drawing_number}</h1>
            <Badge className={cn(getStatusColor(drawing.status))}>
              {STATUS_LABELS[drawing.status]}
            </Badge>
            <Badge variant="secondary">Rev {drawing.current_revision}</Badge>
          </div>
          <p className="text-lg text-muted-foreground">{drawing.title}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setRevisionFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Revision
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/engineering/drawings/${drawing.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      {/* Workflow Actions */}
      <WorkflowActions
        drawingId={drawing.id}
        currentStatus={drawing.status}
        fileUrl={drawing.file_url}
        onStatusChange={onRefresh}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="revisions">
                Revisions ({revisions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 mt-4">
              {/* Description */}
              {drawing.description && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {drawing.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Drawing File */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Drawing File
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {drawing.file_url ? (
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileType className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-medium">
                            {drawing.drawing_number}.{drawing.file_type}
                          </p>
                          {drawing.file_size_kb && (
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(drawing.file_size_kb)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={drawing.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={drawing.file_url} download>
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </a>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No file uploaded yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Workflow History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Workflow History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {drawing.drafted_at && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Drafted</span>
                        <span>
                          {drawing.drafted_by_employee?.full_name || '-'} •{' '}
                          {formatDrawingDate(drawing.drafted_at)}
                        </span>
                      </div>
                    )}
                    {drawing.checked_at && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Checked</span>
                        <span>
                          {drawing.checked_by_employee?.full_name || '-'} •{' '}
                          {formatDrawingDate(drawing.checked_at)}
                        </span>
                      </div>
                    )}
                    {drawing.approved_at && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Approved</span>
                        <span>
                          {drawing.approved_by_employee?.full_name || '-'} •{' '}
                          {formatDrawingDate(drawing.approved_at)}
                        </span>
                      </div>
                    )}
                    {drawing.issued_at && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Issued</span>
                        <span>
                          {drawing.issued_by_employee?.full_name || '-'} •{' '}
                          {formatDrawingDate(drawing.issued_at)}
                        </span>
                      </div>
                    )}
                    {!drawing.drafted_at &&
                      !drawing.checked_at &&
                      !drawing.approved_at &&
                      !drawing.issued_at && (
                        <p className="text-sm text-muted-foreground">
                          No workflow actions recorded yet.
                        </p>
                      )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="revisions" className="mt-4">
              {loadingRevisions ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <RevisionHistory revisions={revisions} />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Metadata */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Drawing Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Category</span>
                <Badge variant="outline">
                  {drawing.category?.category_code} - {drawing.category?.category_name}
                </Badge>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Ruler className="h-3 w-3" />
                  Scale
                </span>
                <span className="text-sm">{drawing.scale || '-'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Paper Size</span>
                <span className="text-sm">{drawing.paper_size}</span>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Created
                </span>
                <span className="text-sm">{formatDrawingDate(drawing.created_at)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Updated</span>
                <span className="text-sm">{formatDrawingDate(drawing.updated_at)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Project Association */}
          {(drawing.project || drawing.job_order) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Associated With</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {drawing.project && (
                  <div>
                    <span className="text-sm text-muted-foreground">Project</span>
                    <p className="font-medium">{drawing.project.name}</p>
                  </div>
                )}
                {drawing.job_order && (
                  <div>
                    <span className="text-sm text-muted-foreground">Job Order</span>
                    <p className="font-medium font-mono">
                      {drawing.job_order.jo_number}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {drawing.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {drawing.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Revision Form Dialog */}
      <RevisionForm
        drawingId={drawing.id}
        currentRevision={drawing.current_revision}
        open={revisionFormOpen}
        onOpenChange={setRevisionFormOpen}
        onSuccess={handleRevisionSuccess}
      />
    </div>
  );
}
