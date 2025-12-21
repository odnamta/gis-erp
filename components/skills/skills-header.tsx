'use client';

import { Button } from '@/components/ui/button';
import { RefreshCw, Award } from 'lucide-react';

interface SkillsHeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
}

export function SkillsHeader({ onRefresh, isLoading }: SkillsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Award className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Skills Management</h1>
          <p className="text-muted-foreground">
            Track employee skills, certifications, and identify capability gaps
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isLoading}
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
}
