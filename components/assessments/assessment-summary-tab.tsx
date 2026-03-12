'use client';

// components/assessments/assessment-summary-tab.tsx
// Summary tab for Technical Assessment detail view (v0.58)

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Wrench } from 'lucide-react';
import { TechnicalAssessment } from '@/types/assessment';
import { formatWeight, formatDimensions, formatCOG } from '@/lib/assessment-utils';

interface AssessmentSummaryTabProps {
  assessment: TechnicalAssessment;
}

export function AssessmentSummaryTab({ assessment }: AssessmentSummaryTabProps) {
  return (
    <div className="space-y-6">
      {/* Cargo Specifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Cargo Specifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="font-medium">{assessment.cargo_description || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Weight</p>
                <p className="font-medium text-lg">
                  {formatWeight(assessment.cargo_weight_tons)}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Dimensions (L × W × H)</p>
                <p className="font-medium">
                  {formatDimensions(assessment.cargo_dimensions)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Center of Gravity</p>
                <p className="font-medium">
                  {formatCOG(assessment.cargo_dimensions)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Recommendations */}
      {assessment.equipment_recommended && assessment.equipment_recommended.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Equipment Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assessment.equipment_recommended.map((equipment, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{equipment.equipment_type}</p>
                      <Badge variant="outline">Qty: {equipment.quantity}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {equipment.specification}
                    </p>
                    {equipment.notes && (
                      <p className="text-sm mt-2">{equipment.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations, Limitations, Assumptions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {assessment.recommendations && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{assessment.recommendations}</p>
            </CardContent>
          </Card>
        )}

        {assessment.limitations && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Limitations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{assessment.limitations}</p>
            </CardContent>
          </Card>
        )}

        {assessment.assumptions && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assumptions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{assessment.assumptions}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Related Entities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Related Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">{assessment.customer?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Project</p>
              <p className="font-medium">{assessment.project?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Quotation</p>
              <p className="font-medium">{assessment.quotation?.quotation_number || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Job Order</p>
              <p className="font-medium">{assessment.job_order?.jo_number || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
