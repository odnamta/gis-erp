'use client';

import { useState } from 'react';
import { ChevronLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ChapterList } from './chapter-list';
import { HeadingList } from './heading-list';
import { HSCodeList } from './hs-code-list';
import type { HSChapter, HSHeading, HSCode } from '@/types/hs-codes';

interface HSCodeBrowserProps {
  onSelect?: (hsCode: HSCode) => void;
  className?: string;
}

type BrowseLevel = 'chapters' | 'headings' | 'codes';

export function HSCodeBrowser({ onSelect, className }: HSCodeBrowserProps) {
  const [level, setLevel] = useState<BrowseLevel>('chapters');
  const [selectedChapter, setSelectedChapter] = useState<HSChapter | null>(null);
  const [selectedHeading, setSelectedHeading] = useState<HSHeading | null>(null);

  const handleChapterSelect = (chapter: HSChapter) => {
    setSelectedChapter(chapter);
    setSelectedHeading(null);
    setLevel('headings');
  };

  const handleHeadingSelect = (heading: HSHeading) => {
    setSelectedHeading(heading);
    setLevel('codes');
  };

  const handleCodeSelect = (code: HSCode) => {
    onSelect?.(code);
  };

  const goBack = () => {
    if (level === 'codes') {
      setLevel('headings');
      setSelectedHeading(null);
    } else if (level === 'headings') {
      setLevel('chapters');
      setSelectedChapter(null);
    }
  };

  const goToChapters = () => {
    setLevel('chapters');
    setSelectedChapter(null);
    setSelectedHeading(null);
  };

  const goToHeadings = () => {
    setLevel('headings');
    setSelectedHeading(null);
  };

  return (
    <div className={className}>
      {/* Navigation */}
      <div className="flex items-center gap-4 mb-4">
        {level !== 'chapters' && (
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        )}
        
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              {level === 'chapters' ? (
                <BreadcrumbPage className="flex items-center gap-1">
                  <Home className="h-4 w-4" />
                  Chapters
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    goToChapters();
                  }}
                  className="flex items-center gap-1"
                >
                  <Home className="h-4 w-4" />
                  Chapters
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            
            {selectedChapter && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {level === 'headings' ? (
                    <BreadcrumbPage>
                      Chapter {selectedChapter.chapterCode}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        goToHeadings();
                      }}
                    >
                      Chapter {selectedChapter.chapterCode}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </>
            )}
            
            {selectedHeading && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    Heading {selectedHeading.headingCode}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Title */}
      <div className="mb-4">
        {level === 'chapters' && (
          <h2 className="text-lg font-semibold">HS Code Chapters</h2>
        )}
        {level === 'headings' && selectedChapter && (
          <div>
            <h2 className="text-lg font-semibold">
              Chapter {selectedChapter.chapterCode} - Headings
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedChapter.chapterName}
            </p>
          </div>
        )}
        {level === 'codes' && selectedHeading && (
          <div>
            <h2 className="text-lg font-semibold">
              Heading {selectedHeading.headingCode} - HS Codes
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedHeading.headingName}
            </p>
          </div>
        )}
      </div>

      {/* Content */}
      {level === 'chapters' && (
        <ChapterList onSelect={handleChapterSelect} />
      )}
      
      {level === 'headings' && selectedChapter && (
        <HeadingList
          chapterId={selectedChapter.id}
          onSelect={handleHeadingSelect}
        />
      )}
      
      {level === 'codes' && selectedHeading && (
        <HSCodeList
          headingId={selectedHeading.id}
          onSelect={handleCodeSelect}
        />
      )}
    </div>
  );
}
