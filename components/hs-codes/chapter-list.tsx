'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, Folder } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getHSChapters } from '@/lib/hs-utils';
import type { HSChapter } from '@/types/hs-codes';

interface ChapterListProps {
  onSelect?: (chapter: HSChapter) => void;
  selectedChapterId?: string;
  className?: string;
}

export function ChapterList({
  onSelect,
  selectedChapterId,
  className,
}: ChapterListProps) {
  const [chapters, setChapters] = useState<HSChapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadChapters() {
      setIsLoading(true);
      try {
        const data = await getHSChapters();
        setChapters(data);
      } catch (error) {
        console.error('Error loading chapters:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadChapters();
  }, []);

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      {chapters.map((chapter) => (
        <button
          key={chapter.id}
          type="button"
          onClick={() => onSelect?.(chapter)}
          className={cn(
            'w-full flex items-center gap-3 rounded-md p-3 text-left transition-colors',
            'hover:bg-accent',
            selectedChapterId === chapter.id && 'bg-accent'
          )}
        >
          <Folder className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-medium">
                Chapter {chapter.chapterCode}
              </span>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {chapter.chapterName}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      ))}
      
      {chapters.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-8">
          No chapters found
        </div>
      )}
    </div>
  );
}
