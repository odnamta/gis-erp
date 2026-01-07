'use server';

/**
 * Help Center Server Actions
 * v0.38: Help Center & Documentation
 */

import { createClient } from '@/lib/supabase/server';
import {
  HelpArticle,
  HelpArticleRow,
  HelpFAQ,
  HelpFAQRow,
  HelpSearchResult,
  FeedbackType,
} from '@/types/help-center';
import {
  mapDbRowToArticle,
  mapDbRowToFAQ,
  isValidSearchQuery,
} from '@/lib/help-center-utils';

// =====================================================
// Search Actions
// =====================================================

/**
 * Search help articles and FAQs using full-text search
 */
export async function searchHelpContent(
  query: string,
  userRole: string
): Promise<HelpSearchResult[]> {
  if (!isValidSearchQuery(query)) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('search_help_content', {
    search_query: query,
    user_role: userRole,
    max_results: 20,
  });

  if (error) {
    console.error('Help search error:', error);
    return [];
  }

  return (data || []) as HelpSearchResult[];
}

// =====================================================
// Article Retrieval Actions
// =====================================================

/**
 * Get all published articles for a user's role
 */
export async function getArticlesForRole(
  userRole: string
): Promise<HelpArticle[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('help_articles')
    .select('*')
    .eq('is_published', true)
    .or(`applicable_roles.cs.{${userRole}},applicable_roles.eq.{}`)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching articles:', error);
    return [];
  }

  return (data || []).map((row) => mapDbRowToArticle(row as unknown as HelpArticleRow));
}

/**
 * Get article by slug
 */
export async function getArticleBySlug(
  slug: string
): Promise<HelpArticle | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('help_articles')
    .select('*')
    .eq('article_slug', slug)
    .eq('is_published', true)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching article:', error);
    }
    return null;
  }

  return mapDbRowToArticle(data as unknown as HelpArticleRow);
}

/**
 * Get contextual articles for a route
 */
export async function getContextualArticles(
  route: string,
  userRole: string
): Promise<HelpArticle[]> {
  const supabase = await createClient();

  // Normalize route
  const normalizedRoute = route.replace(/\/$/, '');

  const { data, error } = await supabase
    .from('help_articles')
    .select('*')
    .eq('is_published', true)
    .or(`applicable_roles.cs.{${userRole}},applicable_roles.eq.{}`)
    .contains('related_routes', [normalizedRoute])
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching contextual articles:', error);
    return [];
  }

  return (data || []).map((row) => mapDbRowToArticle(row as unknown as HelpArticleRow));
}

/**
 * Get articles by category
 */
export async function getArticlesByCategory(
  category: string,
  userRole: string
): Promise<HelpArticle[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('help_articles')
    .select('*')
    .eq('is_published', true)
    .eq('category', category)
    .or(`applicable_roles.cs.{${userRole}},applicable_roles.eq.{}`)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching articles by category:', error);
    return [];
  }

  return (data || []).map((row) => mapDbRowToArticle(row as unknown as HelpArticleRow));
}

/**
 * Get related articles by IDs
 */
export async function getRelatedArticles(
  articleIds: string[]
): Promise<HelpArticle[]> {
  if (articleIds.length === 0) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('help_articles')
    .select('*')
    .eq('is_published', true)
    .in('id', articleIds);

  if (error) {
    console.error('Error fetching related articles:', error);
    return [];
  }

  return (data || []).map((row) => mapDbRowToArticle(row as unknown as HelpArticleRow));
}

// =====================================================
// FAQ Retrieval Actions
// =====================================================

/**
 * Get all FAQs for a user's role
 */
export async function getFAQsForRole(
  userRole: string
): Promise<HelpFAQ[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('help_faqs')
    .select('*')
    .or(`applicable_roles.cs.{${userRole}},applicable_roles.eq.{}`)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching FAQs:', error);
    return [];
  }

  return (data || []).map((row) => mapDbRowToFAQ(row as unknown as HelpFAQRow));
}

// =====================================================
// Feedback Actions
// =====================================================

/**
 * Increment article view count
 */
export async function incrementViewCount(
  articleId: string
): Promise<void> {
  const supabase = await createClient();

  // Try to increment using RPC if available, otherwise do manual increment
  const { data: article, error: fetchError } = await supabase
    .from('help_articles')
    .select('view_count')
    .eq('id', articleId)
    .single();

  if (fetchError) {
    console.error('Error fetching article for view count:', fetchError);
    return;
  }

  const currentCount = (article?.view_count as number) || 0;
  const { error: updateError } = await supabase
    .from('help_articles')
    .update({ view_count: currentCount + 1 })
    .eq('id', articleId);

  if (updateError) {
    console.error('Error incrementing view count:', updateError);
  }
}

/**
 * Record article feedback (helpful/not helpful)
 */
export async function recordFeedback(
  articleId: string,
  feedbackType: FeedbackType
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const column = feedbackType === 'helpful' ? 'helpful_count' : 'not_helpful_count';

  // Get current count
  const { data: article, error: fetchError } = await supabase
    .from('help_articles')
    .select(column)
    .eq('id', articleId)
    .single();

  if (fetchError) {
    console.error('Error fetching article for feedback:', fetchError);
    return { success: false, error: 'Article not found' };
  }

  // Increment count
  const currentCount = (article as Record<string, number>)[column] || 0;
  const { error: updateError } = await supabase
    .from('help_articles')
    .update({ [column]: currentCount + 1 })
    .eq('id', articleId);

  if (updateError) {
    console.error('Error recording feedback:', updateError);
    return { success: false, error: 'Failed to record feedback' };
  }

  return { success: true };
}
