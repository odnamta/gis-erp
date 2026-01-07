/**
 * Help Category Page
 * v0.38: Help Center & Documentation
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HelpArticleCard } from '@/components/help-center/help-article-card';
import { createClient } from '@/lib/supabase/server';
import { getArticlesByCategory } from '@/lib/help-center-actions';
import { 
  getCategoryDisplayInfo, 
  isValidCategory 
} from '@/lib/help-center-utils';
import { HelpArticleCategory } from '@/types/help-center';

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

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

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;

  if (!isValidCategory(category)) {
    notFound();
  }

  const userRole = await getUserRole();
  const articles = await getArticlesByCategory(category as HelpArticleCategory, userRole);
  const categoryInfo = getCategoryDisplayInfo(category as HelpArticleCategory);

  return (
    <div className="container max-w-4xl py-8">
      {/* Back link */}
      <Link href="/help">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Help Center
        </Button>
      </Link>

      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">{categoryInfo.icon}</span>
          <h1 className="text-3xl font-bold">{categoryInfo.label}</h1>
        </div>
        <p className="text-muted-foreground">
          {articles.length} {articles.length === 1 ? 'article' : 'articles'} in this category
        </p>
      </header>

      {/* Articles */}
      {articles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No articles found in this category.
          </p>
          <Link href="/help">
            <Button variant="link" className="mt-2">
              Browse other categories
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {articles.map((article) => (
            <HelpArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
