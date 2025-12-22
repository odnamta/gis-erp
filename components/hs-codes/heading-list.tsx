'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, FolderOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getHSHeadings } from '@/lib/hs-utils';
import type { HSHeading } from '@/types/hs-codes';

interface HeadingListProps {
  chapterId: string;
  onSelect?: (heading: HSHeading) => void;
  selectedHeadingId?: string;
  className?: string;
}

export function HeadingList({
  chapterId,
  onSelect,
  selectedHeadingId,
  className,
}: HeadingListProps) {
  const [headings, setHeadings] = useState<HSHeading[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHeadings() {
      setIsLoading(true);
      try {
        const data = await getHSHeadings(chapterId);
        setHeadings(data);
      } catch (error) {
        console.error('Error loading headings:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (chapterId) {
      loadHeadings();
    }
  }, [chapterId]);

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      {headings.map((heading) => (
        <button
          key={heading.id}
          type="button"
          onClick={() => onSelect?.(heading)}
          className={cn(
            'w-full flex items-center gap-3 rounded-md p-3 text-left transition-colors',
            'hover:bg-accent',
            selectedHeadingId === heading.id && 'bg-accent'
          )}
        >
          <FolderOpen className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-medium">
                {heading.headingCode}
              </span>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {heading.headingName}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      ))}
      
      {headings.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-8">
          No headings found in this chapter
        </div>
      )}
    </div>
  );
}
