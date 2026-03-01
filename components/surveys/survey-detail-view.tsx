'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  RouteSurveyWithRelations,
  RouteWaypoint,
  SurveyChecklistItem,
  TransportDimensions,
} from '@/types/survey';
import {
  getSurveyStatusColor,
  getFeasibilityColor,
  SURVEY_STATUS_LABELS,
  FEASIBILITY_LABELS,
  formatDimensions,
  formatWeight,
  formatDistance,
  formatTravelTime,
  formatCurrency,
} from '@/lib/survey-utils';
import { formatDate } from '@/lib/utils/format';
import { WaypointTable } from './waypoint-table';
import { ChecklistSection } from './checklist-section';
import { RouteOverview } from './route-overview';
import { FeasibilityForm } from './feasibility-form';
import { startSurvey, cancelSurvey } from '@/lib/survey-actions';
import {
  ArrowLeft,
  Edit,
  MoreVertical,
  Play,
  XCircle,
  FileText,
  Package,
  Truck,
  MapPin,
  CheckSquare,
  ClipboardList,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PDFButtons } from '@/components/pdf/pdf-buttons';

interface SurveyDetailViewProps {
  survey: RouteSurveyWithRelations;
  waypoints: RouteWaypoint[];
  checklist: SurveyChecklistItem[];
}

export function SurveyDetailView({
  survey,
  waypoints,
  checklist,
}: SurveyDetailViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('details');
  const [showFeasibilityForm, setShowFeasibilityForm] = useState(false);

  const transportDimensions: TransportDimensions = {
    height: survey.totalHeightM || 0,
    width: survey.totalWidthM || 0,
    weight: survey.totalWeightTons || 0,
    turnRadius: survey.turningRadiusM || 0,
  };

  const handleStartSurvey = async () => {
    const result = await startSurvey(survey.id);
    if (result.success) {
      toast.success('Survey started');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to start survey');
    }
  };

  const handleCancelSurvey = async () => {
    const result = await cancelSurvey(survey.id);
    if (result.success) {
      toast.success('Survey cancelled');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to cancel survey');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/engineering/surveys">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{survey.surveyNumber}</h1>
              <Badge className={getSurveyStatusColor(survey.status)}>
                {SURVEY_STATUS_LABELS[survey.status]}
              </Badge>
              {survey.feasibility && (
                <Badge className={getFeasibilityColor(survey.feasibility)}>
                  {FEASIBILITY_LABELS[survey.feasibility]}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">{survey.cargoDescription}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {survey.status === 'scheduled' && (
            <Button onClick={handleStartSurvey}>
              <Play className="h-4 w-4 mr-2" />
              Start Survey
            </Button>
          )}
          {survey.status === 'in_progress' && (
            <Button onClick={() => setShowFeasibilityForm(true)}>
              <CheckSquare className="h-4 w-4 mr-2" />
              Complete Survey
            </Button>
          )}
          {['requested', 'scheduled', 'in_progress'].includes(survey.status) && (
            <Button variant="outline" asChild>
              <Link href={`/engineering/surveys/${survey.id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          )}
          <PDFButtons
            documentType="survey"
            documentId={survey.id}
            documentNumber={survey.surveyNumber}
            size="sm"
            variant="outline"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {survey.status !== 'cancelled' && survey.status !== 'completed' && (
                <DropdownMenuItem onClick={handleCancelSurvey} className="text-destructive">
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Survey
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Feasibility Form Dialog */}
      {showFeasibilityForm && (
        <FeasibilityForm
          survey={survey}
          onClose={() => setShowFeasibilityForm(false)}
          onSuccess={() => {
            setShowFeasibilityForm(false);
            router.refresh();
          }}
        />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Details
          </TabsTrigger>
          <TabsTrigger value="route" className="gap-2">
            <MapPin className="h-4 w-4" />
            Route Map
          </TabsTrigger>
          <TabsTrigger value="waypoints" className="gap-2">
            <MapPin className="h-4 w-4" />
            Waypoints
          </TabsTrigger>
          <TabsTrigger value="checklist" className="gap-2">
            <CheckSquare className="h-4 w-4" />
            Checklist
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-2">
            <FileText className="h-4 w-4" />
            Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <DetailsTab survey={survey} />
        </TabsContent>

        <TabsContent value="route">
          <RouteOverview survey={survey} waypoints={waypoints} />
        </TabsContent>

        <TabsContent value="waypoints">
          <WaypointTable
            surveyId={survey.id}
            waypoints={waypoints}
            transportDimensions={transportDimensions}
            editable={['in_progress', 'scheduled'].includes(survey.status)}
          />
        </TabsContent>

        <TabsContent value="checklist">
          <ChecklistSection
            surveyId={survey.id}
            checklist={checklist}
            editable={['in_progress', 'scheduled'].includes(survey.status)}
          />
        </TabsContent>

        <TabsContent value="report">
          <ReportTab survey={survey} waypoints={waypoints} checklist={checklist} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DetailsTab({ survey }: { survey: RouteSurveyWithRelations }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Cargo Dimensions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Cargo Dimensions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Description</span>
            <span className="font-medium">{survey.cargoDescription}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Dimensions</span>
            <span className="font-medium">
              {formatDimensions(survey.cargoLengthM, survey.cargoWidthM, survey.cargoHeightM)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Weight</span>
            <span className="font-medium">{formatWeight(survey.cargoWeightTons)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Transport Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Transport Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Dimensions</span>
            <span className="font-medium">
              {formatDimensions(survey.totalLengthM, survey.totalWidthM, survey.totalHeightM)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Weight</span>
            <span className="font-medium">{formatWeight(survey.totalWeightTons)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Axle Config</span>
            <span className="font-medium">{survey.axleConfiguration || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ground Clearance</span>
            <span className="font-medium">
              {survey.groundClearanceM ? `${survey.groundClearanceM}m` : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Turn Radius</span>
            <span className="font-medium">
              {survey.turningRadiusM ? `${survey.turningRadiusM}m` : '-'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Route Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Route Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Origin</span>
            <span className="font-medium">{survey.originLocation}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Destination</span>
            <span className="font-medium">{survey.destinationLocation}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Distance</span>
            <span className="font-medium">{formatDistance(survey.routeDistanceKm)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Est. Travel Time</span>
            <span className="font-medium">{formatTravelTime(survey.estimatedTravelTimeHours)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Survey Info */}
      <Card>
        <CardHeader>
          <CardTitle>Survey Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Surveyor</span>
            <span className="font-medium">{survey.surveyorName || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Survey Date</span>
            <span className="font-medium">
              {survey.surveyDate
                ? formatDate(survey.surveyDate)
                : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Customer</span>
            <span className="font-medium">{survey.customer?.name || '-'}</span>
          </div>
        </CardContent>
      </Card>

      {/* Cost Estimates (if completed) */}
      {survey.status === 'completed' && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Cost Estimates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Survey Cost</p>
                <p className="font-medium">{formatCurrency(survey.surveyCost)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Permit Cost</p>
                <p className="font-medium">{formatCurrency(survey.permitCostEstimate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Escort Cost</p>
                <p className="font-medium">{formatCurrency(survey.escortCostEstimate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Road Repair</p>
                <p className="font-medium">{formatCurrency(survey.roadRepairCostEstimate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="font-bold text-lg">{formatCurrency(survey.totalRouteCostEstimate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReportTab({
  survey,
  waypoints,
  checklist,
}: {
  survey: RouteSurveyWithRelations;
  waypoints: RouteWaypoint[];
  checklist: SurveyChecklistItem[];
}) {
  if (survey.status !== 'completed') {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Report will be available after survey completion.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Survey Report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-medium mb-2">Feasibility Assessment</h3>
          <Badge className={getFeasibilityColor(survey.feasibility)}>
            {survey.feasibility && FEASIBILITY_LABELS[survey.feasibility]}
          </Badge>
          {survey.feasibilityNotes && (
            <p className="mt-2 text-muted-foreground">{survey.feasibilityNotes}</p>
          )}
        </div>

        {survey.escortRequired && (
          <div>
            <h3 className="font-medium mb-2">Escort Requirements</h3>
            <p>Type: {survey.escortType}</p>
            {survey.escortVehiclesCount && <p>Vehicles: {survey.escortVehiclesCount}</p>}
          </div>
        )}

        {survey.travelTimeRestrictions && (
          <div>
            <h3 className="font-medium mb-2">Travel Time Restrictions</h3>
            <p>{survey.travelTimeRestrictions}</p>
          </div>
        )}

        {survey.permitsRequired && survey.permitsRequired.length > 0 && (
          <div>
            <h3 className="font-medium mb-2">Required Permits</h3>
            <ul className="list-disc list-inside space-y-1">
              {survey.permitsRequired.map((permit, index) => (
                <li key={index}>
                  {permit.type} - {permit.authority} ({permit.estimatedDays} days,{' '}
                  {formatCurrency(permit.estimatedCost)})
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h3 className="font-medium mb-2">Waypoints Summary</h3>
          <p>Total waypoints: {waypoints.length}</p>
          <p>Passable: {waypoints.filter((w) => w.isPassable).length}</p>
          <p>Issues: {waypoints.filter((w) => !w.isPassable).length}</p>
        </div>

        <div>
          <h3 className="font-medium mb-2">Checklist Summary</h3>
          <p>OK: {checklist.filter((c) => c.status === 'ok').length}</p>
          <p>Warning: {checklist.filter((c) => c.status === 'warning').length}</p>
          <p>Fail: {checklist.filter((c) => c.status === 'fail').length}</p>
          <p>Pending: {checklist.filter((c) => c.status === 'pending').length}</p>
        </div>
      </CardContent>
    </Card>
  );
}
