/**
 * Help Center Main Page
 * v0.38: Help Center & Documentation
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { HelpArticleSearch } from '@/components/help-center/help-article-search';
import { QuickLinks } from '@/components/help-center/quick-links';
import { CategoryCard } from '@/components/help-center/category-card';
import { FAQAccordion } from '@/components/help-center/faq-accordion';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { getArticlesForRole, getFAQsForRole } from '@/lib/help-center-actions';
import { calculateCategoryCounts, sortFAQsByDisplayOrder } from '@/lib/help-center-utils';

async function getUserRole(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return 'viewer';
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  return (profile as any)?.role || 'viewer';
}

export default async function HelpCenterPage() {
  const userRole = await getUserRole();
  const [articles, faqs] = await Promise.all([
    getArticlesForRole(userRole),
    getFAQsForRole(userRole),
  ]);

  const categoryCounts = calculateCategoryCounts(articles);
  const sortedFaqs = sortFAQsByDisplayOrder(faqs).slice(0, 5);

  return (
    <div className="container max-w-5xl py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Help Center</h1>
        <p className="text-muted-foreground">
          Find answers, guides, and documentation
        </p>
      </div>

      {/* Search */}
      <div className="max-w-xl mx-auto mb-8">
        <Suspense fallback={<div className="h-10 bg-muted animate-pulse rounded-md" />}>
          <HelpArticleSearch userRole={userRole} />
        </Suspense>
      </div>

      {/* Quick Links */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
          Quick Links
        </h2>
        <QuickLinks />
      </section>

      <Separator className="my-8" />

      {/* Browse by Category */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
          Browse by Category
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {categoryCounts.map((categoryInfo) => (
            <CategoryCard key={categoryInfo.category} categoryInfo={categoryInfo} />
          ))}
        </div>
      </section>

      <Separator className="my-8" />

      {/* FAQs */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Frequently Asked Questions
          </h2>
          <Link href="/help/faqs">
            <Button variant="link" size="sm" className="text-xs">
              View All FAQs
            </Button>
          </Link>
        </div>
        <FAQAccordion faqs={sortedFaqs} />
      </section>

      <Separator className="my-8" />

      {/* Contact */}
      <section className="text-center text-sm text-muted-foreground">
        <p>
          Need more help? Contact your system administrator or email{' '}
          <a 
            href="mailto:support@gamaintisamudera.co.id" 
            className="text-primary hover:underline"
          >
            support@gamaintisamudera.co.id
          </a>
        </p>
      </section>
    </div>
  );
}
