'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RouteWaypoint, WaypointFormData, WaypointType, RoadCondition, RoadSurface } from '@/types/survey';
import { WAYPOINT_TYPE_LABELS } from '@/lib/survey-utils';
import { createWaypoint, updateWaypoint } from '@/lib/survey-actions';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface WaypointFormProps {
  surveyId: string;
  waypoint?: RouteWaypoint;
  onClose: () => void;
  onSuccess: () => void;
}

export function WaypointForm({
  surveyId,
  waypoint,
  onClose,
  onSuccess,
}: WaypointFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<WaypointFormData>({
    waypointType: waypoint?.waypointType || 'checkpoint',
    locationName: waypoint?.locationName || '',
    coordinates: waypoint?.coordinates || '',
    kmFromStart: waypoint?.kmFromStart,
    roadCondition: waypoint?.roadCondition,
    roadWidthM: waypoint?.roadWidthM,
    roadSurface: waypoint?.roadSurface,
    verticalClearanceM: waypoint?.verticalClearanceM,
    horizontalClearanceM: waypoint?.horizontalClearanceM,
    bridgeName: waypoint?.bridgeName || '',
    bridgeCapacityTons: waypoint?.bridgeCapacityTons,
    bridgeWidthM: waypoint?.bridgeWidthM,
    bridgeLengthM: waypoint?.bridgeLengthM,
    turnRadiusAvailableM: waypoint?.turnRadiusAvailableM,
    turnFeasible: waypoint?.turnFeasible,
    obstacleType: waypoint?.obstacleType || '',
    obstacleDescription: waypoint?.obstacleDescription || '',
    actionRequired: waypoint?.actionRequired || '',
    actionCostEstimate: waypoint?.actionCostEstimate,
    actionResponsible: waypoint?.actionResponsible || '',
    isPassable: waypoint?.isPassable ?? true,
    passableNotes: waypoint?.passableNotes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = waypoint
        ? await updateWaypoint(waypoint.id, formData)
        : await createWaypoint(surveyId, formData);

      if (result.success) {
        toast.success(waypoint ? 'Waypoint updated' : 'Waypoint added');
        onSuccess();
      } else {
        toast.error(result.error || 'Failed to save waypoint');
      }
    } catch (_error) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof WaypointFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field: keyof WaypointFormData, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    handleChange(field, numValue);
  };

  const showBridgeFields = formData.waypointType === 'bridge';
  const showTurnFields = ['turn', 'intersection'].includes(formData.waypointType);
  const showObstacleFields = ['obstacle', 'overhead', 'underpass'].includes(formData.waypointType);
  const showClearanceFields = ['underpass', 'overhead', 'bridge', 'obstacle'].includes(formData.waypointType);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{waypoint ? 'Edit Waypoint' : 'Add Waypoint'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Waypoint Type *</Label>
              <Select
                value={formData.waypointType}
                onValueChange={(v) => handleChange('waypointType', v as WaypointType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(WAYPOINT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="kmFromStart">KM from Start</Label>
              <Input
                id="kmFromStart"
                type="number"
                step="0.1"
                min="0"
                value={formData.kmFromStart ?? ''}
                onChange={(e) => handleNumberChange('kmFromStart', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="locationName">Location Name *</Label>
            <Input
              id="locationName"
              value={formData.locationName}
              onChange={(e) => handleChange('locationName', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coordinates">Coordinates</Label>
            <Input
              id="coordinates"
              value={formData.coordinates}
              onChange={(e) => handleChange('coordinates', e.target.value)}
              placeholder="e.g., -7.2575, 112.7521"
            />
          </div>

          {/* Road Condition */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Road Condition</Label>
              <Select
                value={formData.roadCondition || 'none'}
                onValueChange={(v) => handleChange('roadCondition', v === 'none' ? undefined : v as RoadCondition)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                  <SelectItem value="impassable">Impassable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Road Surface</Label>
              <Select
                value={formData.roadSurface || 'none'}
                onValueChange={(v) => handleChange('roadSurface', v === 'none' ? undefined : v as RoadSurface)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  <SelectItem value="asphalt">Asphalt</SelectItem>
                  <SelectItem value="concrete">Concrete</SelectItem>
                  <SelectItem value="gravel">Gravel</SelectItem>
                  <SelectItem value="dirt">Dirt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="roadWidthM">Road Width (m)</Label>
              <Input
                id="roadWidthM"
                type="number"
                step="0.1"
                min="0"
                value={formData.roadWidthM ?? ''}
                onChange={(e) => handleNumberChange('roadWidthM', e.target.value)}
              />
            </div>
          </div>

          {/* Clearance Fields */}
          {showClearanceFields && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="verticalClearanceM">Vertical Clearance (m)</Label>
                <Input
                  id="verticalClearanceM"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.verticalClearanceM ?? ''}
                  onChange={(e) => handleNumberChange('verticalClearanceM', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horizontalClearanceM">Horizontal Clearance (m)</Label>
                <Input
                  id="horizontalClearanceM"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.horizontalClearanceM ?? ''}
                  onChange={(e) => handleNumberChange('horizontalClearanceM', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Bridge Fields */}
          {showBridgeFields && (
            <>
              <div className="space-y-2">
                <Label htmlFor="bridgeName">Bridge Name</Label>
                <Input
                  id="bridgeName"
                  value={formData.bridgeName}
                  onChange={(e) => handleChange('bridgeName', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bridgeCapacityTons">Capacity (tons)</Label>
                  <Input
                    id="bridgeCapacityTons"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.bridgeCapacityTons ?? ''}
                    onChange={(e) => handleNumberChange('bridgeCapacityTons', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bridgeWidthM">Width (m)</Label>
                  <Input
                    id="bridgeWidthM"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.bridgeWidthM ?? ''}
                    onChange={(e) => handleNumberChange('bridgeWidthM', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bridgeLengthM">Length (m)</Label>
                  <Input
                    id="bridgeLengthM"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.bridgeLengthM ?? ''}
                    onChange={(e) => handleNumberChange('bridgeLengthM', e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Turn Fields */}
          {showTurnFields && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="turnRadiusAvailableM">Available Turn Radius (m)</Label>
                <Input
                  id="turnRadiusAvailableM"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.turnRadiusAvailableM ?? ''}
                  onChange={(e) => handleNumberChange('turnRadiusAvailableM', e.target.value)}
                />
              </div>
              <div className="space-y-2 flex items-end gap-2">
                <Switch
                  id="turnFeasible"
                  checked={formData.turnFeasible ?? false}
                  onCheckedChange={(v) => handleChange('turnFeasible', v)}
                />
                <Label htmlFor="turnFeasible">Turn Feasible</Label>
              </div>
            </div>
          )}

          {/* Obstacle Fields */}
          {showObstacleFields && (
            <>
              <div className="space-y-2">
                <Label htmlFor="obstacleType">Obstacle Type</Label>
                <Input
                  id="obstacleType"
                  value={formData.obstacleType}
                  onChange={(e) => handleChange('obstacleType', e.target.value)}
                  placeholder="e.g., Power line, Sign, Tree"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="obstacleDescription">Obstacle Description</Label>
                <Textarea
                  id="obstacleDescription"
                  value={formData.obstacleDescription}
                  onChange={(e) => handleChange('obstacleDescription', e.target.value)}
                />
              </div>
            </>
          )}

          {/* Action Required */}
          <div className="space-y-2">
            <Label htmlFor="actionRequired">Action Required</Label>
            <Textarea
              id="actionRequired"
              value={formData.actionRequired}
              onChange={(e) => handleChange('actionRequired', e.target.value)}
              placeholder="e.g., Remove overhead cable, Police escort needed"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="actionCostEstimate">Action Cost Estimate</Label>
              <Input
                id="actionCostEstimate"
                type="number"
                min="0"
                value={formData.actionCostEstimate ?? ''}
                onChange={(e) => handleNumberChange('actionCostEstimate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actionResponsible">Responsible Party</Label>
              <Input
                id="actionResponsible"
                value={formData.actionResponsible}
                onChange={(e) => handleChange('actionResponsible', e.target.value)}
              />
            </div>
          </div>

          {/* Passability */}
          <div className="space-y-2 flex items-center gap-2">
            <Switch
              id="isPassable"
              checked={formData.isPassable ?? true}
              onCheckedChange={(v) => handleChange('isPassable', v)}
            />
            <Label htmlFor="isPassable">Passable</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passableNotes">Passability Notes</Label>
            <Textarea
              id="passableNotes"
              value={formData.passableNotes}
              onChange={(e) => handleChange('passableNotes', e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {waypoint ? 'Update' : 'Add'} Waypoint
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
