'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RouteSurveyWithRelations, RouteWaypoint } from '@/types/survey';
import {
  formatDistance,
  formatTravelTime,
  WAYPOINT_TYPE_LABELS,
  sortWaypointsByOrder,
} from '@/lib/survey-utils';
import {
  MapPin,
  Navigation,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowDown,
} from 'lucide-react';

interface RouteOverviewProps {
  survey: RouteSurveyWithRelations;
  waypoints: RouteWaypoint[];
}

export function RouteOverview({ survey, waypoints }: RouteOverviewProps) {
  const sortedWaypoints = sortWaypointsByOrder(waypoints);
  const criticalWaypoints = sortedWaypoints.filter((w) => !w.isPassable);
  const warningWaypoints = sortedWaypoints.filter(
    (w) => w.isPassable && w.actionRequired
  );

  return (
    <div className="space-y-6">
      {/* Route Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Navigation className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{formatDistance(survey.routeDistanceKm)}</p>
                <p className="text-sm text-muted-foreground">Total Distance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{formatTravelTime(survey.estimatedTravelTimeHours)}</p>
                <p className="text-sm text-muted-foreground">Est. Travel Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{sortedWaypoints.length}</p>
                <p className="text-sm text-muted-foreground">Waypoints</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Issues */}
      {criticalWaypoints.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <XCircle className="h-5 w-5" />
              Critical Issues ({criticalWaypoints.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalWaypoints.map((wp) => (
                <div key={wp.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <span className="font-medium">{wp.locationName}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      (KM {wp.kmFromStart?.toFixed(1) || '-'})
                    </span>
                  </div>
                  <Badge variant="destructive">{WAYPOINT_TYPE_LABELS[wp.waypointType]}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {warningWaypoints.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Action Required ({warningWaypoints.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {warningWaypoints.map((wp) => (
                <div key={wp.id} className="flex items-start justify-between p-2 bg-white rounded border">
                  <div>
                    <span className="font-medium">{wp.locationName}</span>
                    <p className="text-sm text-muted-foreground">{wp.actionRequired}</p>
                  </div>
                  <Badge variant="outline">{WAYPOINT_TYPE_LABELS[wp.waypointType]}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Route Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Route Path</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Origin */}
            <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <p className="font-medium text-green-800">Origin</p>
                <p className="text-sm">{survey.originLocation}</p>
                {survey.originAddress && (
                  <p className="text-xs text-muted-foreground">{survey.originAddress}</p>
                )}
              </div>
            </div>

            {/* Waypoints */}
            {sortedWaypoints.length > 0 && (
              <div className="ml-5 border-l-2 border-dashed border-gray-300 py-2">
                {sortedWaypoints.map((wp, _index) => (
                  <div key={wp.id} className="relative pl-8 py-2">
                    <div className="absolute left-[-9px] top-1/2 -translate-y-1/2">
                      <div
                        className={`w-4 h-4 rounded-full ${
                          !wp.isPassable
                            ? 'bg-red-500'
                            : wp.actionRequired
                            ? 'bg-yellow-500'
                            : 'bg-blue-500'
                        }`}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-muted-foreground">
                          {wp.kmFromStart?.toFixed(1) || '-'} km
                        </span>
                        <span className="font-medium">{wp.locationName}</span>
                        <Badge variant="outline" className="text-xs">
                          {WAYPOINT_TYPE_LABELS[wp.waypointType]}
                        </Badge>
                      </div>
                      {!wp.isPassable ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : wp.actionRequired ? (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Arrow */}
            <div className="flex justify-center py-2">
              <ArrowDown className="h-6 w-6 text-gray-400" />
            </div>

            {/* Destination */}
            <div className="flex items-center gap-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <p className="font-medium text-red-800">Destination</p>
                <p className="text-sm">{survey.destinationLocation}</p>
                {survey.destinationAddress && (
                  <p className="text-xs text-muted-foreground">{survey.destinationAddress}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
