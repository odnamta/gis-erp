'use client';

import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import {
  RouteWaypoint,
  TransportDimensions,
} from '@/types/survey';
import {
  assessWaypointPassability,
  sortWaypointsByOrder,
  WAYPOINT_TYPE_LABELS,
} from '@/lib/survey-utils';
import { WaypointForm } from './waypoint-form';
import { deleteWaypoint } from '@/lib/survey-actions';
import { Plus, Trash2, Edit, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface WaypointTableProps {
  surveyId: string;
  waypoints: RouteWaypoint[];
  transportDimensions: TransportDimensions;
  editable?: boolean;
}

export function WaypointTable({
  surveyId,
  waypoints,
  transportDimensions,
  editable = false,
}: WaypointTableProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingWaypoint, setEditingWaypoint] = useState<RouteWaypoint | null>(null);

  const sortedWaypoints = sortWaypointsByOrder(waypoints);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this waypoint?')) return;

    const result = await deleteWaypoint(id);
    if (result.success) {
      toast.success('Waypoint deleted');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to delete waypoint');
    }
  };

  const getPassabilityIcon = (waypoint: RouteWaypoint) => {
    const assessment = assessWaypointPassability(waypoint, transportDimensions);
    if (assessment.passable) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (assessment.issues.length > 0) {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
    return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
  };

  const getPassabilityBadge = (waypoint: RouteWaypoint) => {
    const assessment = assessWaypointPassability(waypoint, transportDimensions);
    if (assessment.passable) {
      return <Badge className="bg-green-100 text-green-800">OK</Badge>;
    }
    return (
      <Badge className="bg-red-100 text-red-800">
        {assessment.issues.length} issue{assessment.issues.length > 1 ? 's' : ''}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Waypoints</CardTitle>
        {editable && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Waypoint
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {sortedWaypoints.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No waypoints added yet.
            {editable && ' Click "Add Waypoint" to start documenting the route.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">KM</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Assessment</TableHead>
                <TableHead>Action Required</TableHead>
                {editable && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedWaypoints.map((waypoint) => (
                <TableRow key={waypoint.id}>
                  <TableCell className="font-mono">
                    {waypoint.kmFromStart?.toFixed(1) || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{waypoint.locationName}</div>
                    {waypoint.coordinates && (
                      <div className="text-xs text-muted-foreground">
                        {waypoint.coordinates}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {WAYPOINT_TYPE_LABELS[waypoint.waypointType]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getPassabilityIcon(waypoint)}
                      {getPassabilityBadge(waypoint)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {waypoint.actionRequired || '-'}
                  </TableCell>
                  {editable && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingWaypoint(waypoint)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(waypoint.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add/Edit Form Dialog */}
      {(showForm || editingWaypoint) && (
        <WaypointForm
          surveyId={surveyId}
          waypoint={editingWaypoint || undefined}
          onClose={() => {
            setShowForm(false);
            setEditingWaypoint(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingWaypoint(null);
            router.refresh();
          }}
        />
      )}
    </Card>
  );
}
