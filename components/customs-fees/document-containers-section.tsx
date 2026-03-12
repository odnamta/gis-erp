'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { ContainerStatusBadge } from './container-status-badge';
import { FreeTimeIndicator } from './free-time-indicator';
import { getContainersByDocument, updateContainerStatus } from '@/lib/fee-actions';
import { formatFeeAmount } from '@/lib/fee-utils';
import {
  ContainerTrackingWithRelations,
  CustomsDocumentType,
  CONTAINER_SIZE_LABELS,
} from '@/types/customs-fees';
import { format } from 'date-fns';
import { Plus, Package, Loader2, LogOut } from 'lucide-react';

interface DocumentContainersSectionProps {
  documentType: CustomsDocumentType;
  documentId: string;
  editable?: boolean;
}

export function DocumentContainersSection({
  documentType,
  documentId,
  editable = true,
}: DocumentContainersSectionProps) {
  const _router = useRouter();
  const [containers, setContainers] = useState<ContainerTrackingWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadContainers = async () => {
    setLoading(true);
    const data = await getContainersByDocument(documentType, documentId);
    setContainers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadContainers();
  }, [documentType, documentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGateOut = async (container: ContainerTrackingWithRelations) => {
    setActionLoading(container.id);
    await updateContainerStatus(container.id, 'gate_out', format(new Date(), 'yyyy-MM-dd'));
    await loadContainers();
    setActionLoading(null);
  };

  // Calculate stats
  const atPort = containers.filter((c) => c.status === 'at_port').length;
  const totalDemurrage = containers.reduce((sum, c) => sum + (c.total_storage_fee || 0), 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Containers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{containers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">At Port</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{atPort}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Total Demurrage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatFeeAmount(totalDemurrage, 'IDR')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Containers Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Containers
          </CardTitle>
          {editable && (
            <Button asChild size="sm">
              <Link
                href={`/customs/containers/new?document_type=${documentType}&document_id=${documentId}`}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Container
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {containers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No containers tracked for this document.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Container</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Terminal</TableHead>
                  <TableHead>Free Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Storage Fee</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {containers.map((container) => (
                  <TableRow key={container.id}>
                    <TableCell>
                      <div className="font-medium">{container.container_number}</div>
                      {container.seal_number && (
                        <div className="text-xs text-muted-foreground">
                          Seal: {container.seal_number}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {container.container_size
                        ? CONTAINER_SIZE_LABELS[container.container_size]
                        : '-'}
                    </TableCell>
                    <TableCell>{container.terminal || '-'}</TableCell>
                    <TableCell>
                      {container.status === 'at_port' && container.free_time_end ? (
                        <FreeTimeIndicator container={container} showLabel={false} />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <ContainerStatusBadge status={container.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {container.total_storage_fee ? (
                        <span className="font-medium text-red-600">
                          {formatFeeAmount(container.total_storage_fee, 'IDR')}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {container.status === 'at_port' && editable && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGateOut(container)}
                          disabled={actionLoading === container.id}
                        >
                          {actionLoading === container.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <LogOut className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
