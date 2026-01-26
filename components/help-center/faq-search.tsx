'use client';

/**
 * FAQ Search Component
 * v0.38.1: Help Center Enhancement
 */

import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FAQAccordion } from '@/components/help-center/faq-accordion';
import { HelpFAQ } from '@/types/help-center';

interface FAQSearchProps {
  faqs: HelpFAQ[];
}

/**
 * Filter FAQs by search query (case-insensitive match on question or answer)
 */
function filterFAQsByQuery(faqs: HelpFAQ[], query: string): HelpFAQ[] {
  if (!query.trim()) {
    return faqs;
  }
  
  const lowerQuery = query.toLowerCase().trim();
  
  return faqs.filter(faq => 
    faq.question.toLowerCase().includes(lowerQuery) ||
    faq.answer.toLowerCase().includes(lowerQuery)
  );
}

export function FAQSearch({ faqs }: FAQSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaqs = useMemo(() => {
    return filterFAQsByQuery(faqs, searchQuery);
  }, [faqs, searchQuery]);

  const hasNoResults = searchQuery.trim() && filteredFaqs.length === 0;
  const hasNoFaqs = faqs.length === 0;

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Cari FAQ..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => setSearchQuery('')}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </div>

      {/* Results Count */}
      {searchQuery.trim() && !hasNoResults && (
        <p className="text-sm text-muted-foreground">
          Menampilkan {filteredFaqs.length} FAQ
        </p>
      )}

      {/* No FAQs Available */}
      {hasNoFaqs && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Belum ada FAQ tersedia</p>
        </div>
      )}

      {/* No Search Results */}
      {hasNoResults && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Tidak ada FAQ yang ditemukan untuk &quot;{searchQuery}&quot;
          </p>
          <Button
            variant="link"
            onClick={() => setSearchQuery('')}
            className="mt-2"
          >
            Hapus pencarian
          </Button>
        </div>
      )}

      {/* FAQ List */}
      {!hasNoFaqs && !hasNoResults && (
        <FAQAccordion faqs={filteredFaqs} showCategories={true} />
      )}
    </div>
  );
}

// Export the filter function for testing
export { filterFAQsByQuery };
