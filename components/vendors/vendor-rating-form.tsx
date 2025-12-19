'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Star } from 'lucide-react';
import { RatingFormData } from '@/types/vendors';
import { cn } from '@/lib/utils';

// Validation schema
export const ratingSchema = z.object({
  overall_rating: z.number().int().min(1, 'Overall rating is required').max(5),
  punctuality_rating: z.number().int().min(1).max(5).optional(),
  quality_rating: z.number().int().min(1).max(5).optional(),
  communication_rating: z.number().int().min(1).max(5).optional(),
  price_rating: z.number().int().min(1).max(5).optional(),
  was_on_time: z.boolean(),
  had_issues: z.boolean(),
  issue_description: z.string().optional(),
  comments: z.string().optional(),
});

export type RatingFormValues = z.infer<typeof ratingSchema>;

interface VendorRatingFormProps {
  onSubmit: (data: RatingFormData) => Promise<void>;
  isLoading: boolean;
  onCancel?: () => void;
}

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function StarRating({ value, onChange, disabled }: StarRatingProps) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !disabled && onChange(star)}
          disabled={disabled}
          className={cn(
            'p-0.5 transition-colors',
            disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110'
          )}
        >
          <Star
            className={cn(
              'h-6 w-6',
              star <= value
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function VendorRatingForm({ onSubmit, isLoading, onCancel }: VendorRatingFormProps) {
  const {
    handleSubmit,
    setValue,
    watch,
    register,
    formState: { errors },
  } = useForm<RatingFormValues>({
    resolver: zodResolver(ratingSchema),
    defaultValues: {
      overall_rating: 0,
      punctuality_rating: undefined,
      quality_rating: undefined,
      communication_rating: undefined,
      price_rating: undefined,
      was_on_time: true,
      had_issues: false,
      issue_description: '',
      comments: '',
    },
  });

  const overallRating = watch('overall_rating');
  const punctualityRating = watch('punctuality_rating') || 0;
  const qualityRating = watch('quality_rating') || 0;
  const communicationRating = watch('communication_rating') || 0;
  const priceRating = watch('price_rating') || 0;
  const wasOnTime = watch('was_on_time');
  const hadIssues = watch('had_issues');

  const handleFormSubmit = async (data: RatingFormValues) => {
    await onSubmit(data as RatingFormData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Overall Rating */}
      <div className="space-y-2">
        <Label>Overall Rating *</Label>
        <StarRating
          value={overallRating}
          onChange={(v) => setValue('overall_rating', v)}
          disabled={isLoading}
        />
        {errors.overall_rating && (
          <p className="text-sm text-destructive">{errors.overall_rating.message}</p>
        )}
      </div>

      {/* Detailed Ratings */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Punctuality</Label>
          <StarRating
            value={punctualityRating}
            onChange={(v) => setValue('punctuality_rating', v)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label>Quality</Label>
          <StarRating
            value={qualityRating}
            onChange={(v) => setValue('quality_rating', v)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label>Communication</Label>
          <StarRating
            value={communicationRating}
            onChange={(v) => setValue('communication_rating', v)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label>Price</Label>
          <StarRating
            value={priceRating}
            onChange={(v) => setValue('price_rating', v)}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* On-Time Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="was_on_time">Delivered On Time</Label>
          <p className="text-sm text-muted-foreground">
            Was the delivery completed on schedule?
          </p>
        </div>
        <Switch
          id="was_on_time"
          checked={wasOnTime}
          onCheckedChange={(checked) => setValue('was_on_time', checked)}
          disabled={isLoading}
        />
      </div>

      {/* Had Issues Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="had_issues">Had Issues</Label>
          <p className="text-sm text-muted-foreground">
            Were there any problems during the job?
          </p>
        </div>
        <Switch
          id="had_issues"
          checked={hadIssues}
          onCheckedChange={(checked) => setValue('had_issues', checked)}
          disabled={isLoading}
        />
      </div>

      {/* Issue Description */}
      {hadIssues && (
        <div className="space-y-2">
          <Label htmlFor="issue_description">Issue Description</Label>
          <Textarea
            id="issue_description"
            {...register('issue_description')}
            placeholder="Describe the issues encountered..."
            rows={3}
            disabled={isLoading}
          />
        </div>
      )}

      {/* Comments */}
      <div className="space-y-2">
        <Label htmlFor="comments">Additional Comments</Label>
        <Textarea
          id="comments"
          {...register('comments')}
          placeholder="Any additional feedback..."
          rows={3}
          disabled={isLoading}
        />
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading || overallRating === 0}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Rating'
          )}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
