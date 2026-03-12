'use client';

// components/assessments/conclusion-form.tsx
// Conclusion form for Technical Assessments (v0.58)

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';


import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, Save } from 'lucide-react';
import { TechnicalAssessment, ConclusionType } from '@/types/assessment';
import { getConclusionColor, getConclusionLabel } from '@/lib/assessment-utils';
import { updateAssessment } from '@/lib/assessment-actions';
import { Badge } from '@/components/ui/badge';

interface ConclusionFormProps {
  assessment: TechnicalAssessment;
  canEdit: boolean;
}

export function ConclusionForm({ assessment, canEdit }: ConclusionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [conclusion, _setConclusion] = useState<ConclusionType | ''>(assessment.conclusion || '');
  const [conclusionNotes, _setConclusionNotes] = useState(assessment.conclusion_notes || '');
  const [recommendations, setRecommendations] = useState(assessment.recommendations || '');
  const [limitations, setLimitations] = useState(assessment.limitations || '');
  const [assumptions, setAssumptions] = useState(assessment.assumptions || '');

  const hasChanges =
    conclusion !== (assessment.conclusion || '') ||
    conclusionNotes !== (assessment.conclusion_notes || '') ||
    recommendations !== (assessment.recommendations || '') ||
    limitations !== (assessment.limitations || '') ||
    assumptions !== (assessment.assumptions || '');

  const handleSave = async () => {
    setLoading(true);
    try {
      const result = await updateAssessment(assessment.id, {
        recommendations: recommendations || undefined,
        limitations: limitations || undefined,
        assumptions: assumptions || undefined,
      });

      if (result.success) {
        router.refresh();
      }
    } catch (error) {
      console.error('Error saving conclusion:', error);
    } finally {
      setLoading(false);
    }
  };

  // Read-only view for non-editable assessments
  if (!canEdit) {
    return (
      <div className="space-y-6">
        {assessment.conclusion && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conclusion</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={getConclusionColor(assessment.conclusion)}>
                {getConclusionLabel(assessment.conclusion)}
              </Badge>
              {assessment.conclusion_notes && (
                <p className="mt-3 text-sm whitespace-pre-wrap">{assessment.conclusion_notes}</p>
              )}
            </CardContent>
          </Card>
        )}

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

        {!assessment.conclusion && !assessment.recommendations && !assessment.limitations && !assessment.assumptions && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No conclusion or notes added yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Conclusion & Notes</CardTitle>
          <CardDescription>
            Document the assessment conclusion, recommendations, limitations, and assumptions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Conclusion (read-only, set during approval) */}
          {assessment.conclusion && (
            <div className="space-y-2">
              <Label>Current Conclusion</Label>
              <div>
                <Badge className={getConclusionColor(assessment.conclusion)}>
                  {getConclusionLabel(assessment.conclusion)}
                </Badge>
                {assessment.conclusion_notes && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {assessment.conclusion_notes}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Conclusion is set during the approval process
              </p>
            </div>
          )}

          {/* Recommendations */}
          <div className="space-y-2">
            <Label htmlFor="recommendations">Recommendations</Label>
            <Textarea
              id="recommendations"
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              placeholder="Enter recommendations for this assessment..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Specific recommendations based on the assessment findings
            </p>
          </div>

          {/* Limitations */}
          <div className="space-y-2">
            <Label htmlFor="limitations">Limitations</Label>
            <Textarea
              id="limitations"
              value={limitations}
              onChange={(e) => setLimitations(e.target.value)}
              placeholder="Enter any limitations or constraints..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Constraints or limitations that apply to this assessment
            </p>
          </div>

          {/* Assumptions */}
          <div className="space-y-2">
            <Label htmlFor="assumptions">Assumptions</Label>
            <Textarea
              id="assumptions"
              value={assumptions}
              onChange={(e) => setAssumptions(e.target.value)}
              placeholder="Enter assumptions made during the assessment..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Assumptions made during the assessment process
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={loading || !hasChanges}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
