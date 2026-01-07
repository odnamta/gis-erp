'use server';

// =====================================================
// v0.63: AI INSIGHTS - SERVER ACTIONS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import type {
  AIQueryHistory,
  AIQueryTemplate,
  AIQueryResponse,
  QueryHistoryInput,
  TemplateMatch,
} from '@/types/ai-insights';
import {
  validateSQL,
  validateQueryInput,
  matchTemplate,
  formatQueryResponse,
  getSuggestedQuestions,
  canAccessAIInsights,
} from '@/lib/ai-insights-utils';

// =====================================================
// QUERY HISTORY ACTIONS
// =====================================================

/**
 * Log a query to history
 * Property 9: Query History Completeness
 */
export async function logQuery(input: QueryHistoryInput): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('ai_query_history' as any)
      .insert({
        user_id: input.user_id,
        natural_query: input.natural_query,
        generated_sql: input.generated_sql,
        response_type: input.response_type,
        response_data: input.response_data,
        response_text: input.response_text,
        execution_time_ms: input.execution_time_ms,
      });

    if (error) {
      console.error('Error logging query:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in logQuery:', error);
    return { success: false, error: 'Failed to log query' };
  }
}

/**
 * Get query history for a user (limited to 10)
 * Property 10: History Limit
 */
export async function getQueryHistory(userId: string): Promise<AIQueryHistory[]> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('ai_query_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching query history:', error);
      return [];
    }

    return (data || []) as unknown as AIQueryHistory[];
  } catch (error) {
    console.error('Error in getQueryHistory:', error);
    return [];
  }
}

/**
 * Update feedback for a query
 * Property 9: Query History Completeness
 */
export async function updateQueryFeedback(
  queryId: string,
  wasHelpful: boolean,
  feedbackNotes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('ai_query_history')
      .update({
        was_helpful: wasHelpful,
        feedback_notes: feedbackNotes || null,
      })
      .eq('id', queryId);

    if (error) {
      console.error('Error updating feedback:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateQueryFeedback:', error);
    return { success: false, error: 'Failed to update feedback' };
  }
}

// =====================================================
// TEMPLATE ACTIONS
// =====================================================

/**
 * Get all active query templates
 */
export async function getQueryTemplates(): Promise<AIQueryTemplate[]> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('ai_query_templates')
      .select('*')
      .eq('is_active', true)
      .order('template_category');

    if (error) {
      console.error('Error fetching templates:', error);
      return [];
    }

    return (data || []) as unknown as AIQueryTemplate[];
  } catch (error) {
    console.error('Error in getQueryTemplates:', error);
    return [];
  }
}

// =====================================================
// QUERY PROCESSING
// =====================================================

/**
 * Process a natural language query
 * Property 4: Template Response Format Consistency
 * Property 5: Error Responses Include Suggestions
 */
export async function processAIQuery(
  naturalQuery: string,
  userId: string
): Promise<AIQueryResponse> {
  const startTime = Date.now();

  try {
    // Validate input
    if (!validateQueryInput(naturalQuery)) {
      return {
        responseType: 'error',
        responseText: 'Please enter a valid question.',
        suggestions: getSuggestedQuestions(),
      };
    }

    // Get templates
    const templates = await getQueryTemplates();

    // Try template matching first
    const templateMatch = matchTemplate(naturalQuery, templates);

    if (templateMatch) {
      // Validate the generated SQL
      const validation = validateSQL(templateMatch.sql);
      
      if (!validation.isValid) {
        return {
          responseType: 'error',
          responseText: 'I couldn\'t generate a safe query for that question.',
          suggestions: getSuggestedQuestions(),
        };
      }

      // Execute the query
      const result = await executeQuery(validation.sanitizedSQL!);
      
      if (result.error) {
        return {
          responseType: 'error',
          responseText: 'Sorry, I encountered an error processing your question.',
          suggestions: getSuggestedQuestions(),
        };
      }

      // Format response
      const response = formatQueryResponse(naturalQuery, result.data || []);
      
      // Ensure response type matches template format
      if (templateMatch.template.response_format && response.responseType !== 'error') {
        response.responseType = templateMatch.template.response_format;
      }

      // Apply response template if available
      if (templateMatch.template.response_template && response.data !== undefined) {
        response.responseText = applyResponseTemplate(
          templateMatch.template.response_template,
          response.data
        );
      }

      // Log the query
      await logQuery({
        user_id: userId,
        natural_query: naturalQuery,
        generated_sql: templateMatch.sql,
        response_type: response.responseType,
        response_data: response.data,
        response_text: response.responseText,
        execution_time_ms: Date.now() - startTime,
      });

      return {
        ...response,
        executionTimeMs: Date.now() - startTime,
      };
    }

    // No template match - return error with suggestions
    // (AI SQL generation would go here in a full implementation)
    return {
      responseType: 'error',
      responseText: 'I couldn\'t understand that question. Try one of the suggested questions below.',
      suggestions: getSuggestedQuestions(),
    };

  } catch (error) {
    console.error('Error processing AI query:', error);
    return {
      responseType: 'error',
      responseText: 'Sorry, I encountered an error processing your question.',
      suggestions: getSuggestedQuestions(),
    };
  }
}

/**
 * Execute a validated SQL query
 */
async function executeQuery(sql: string): Promise<{ data: unknown[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    
    // Use RPC to execute the query safely
    // For now, we'll use a direct query approach
    // In production, you'd want a dedicated RPC function
    const { data, error } = await supabase.rpc('execute_ai_query' as any, {
      query_text: sql,
    });

    if (error) {
      // Fallback: try direct query for simple selects
      // This is a simplified approach - production would need more robust handling
      console.error('RPC error, query may not be supported:', error);
      return { data: null, error: error.message };
    }

    return { data: (data || []) as unknown[] | null, error: null };
  } catch (error) {
    console.error('Error executing query:', error);
    return { data: null, error: 'Query execution failed' };
  }
}

/**
 * Apply response template with value substitution
 */
function applyResponseTemplate(template: string, value: unknown): string {
  let result = template;
  
  // Replace {value} placeholder
  result = result.replace(/\{value\}/g, String(value));
  
  // Replace {value:currency} placeholder
  result = result.replace(/\{value:currency\}/g, formatCurrencyValue(value));
  
  return result;
}

/**
 * Format value as currency for template
 */
function formatCurrencyValue(value: unknown): string {
  const num = Number(value);
  if (isNaN(num)) return String(value);
  
  return num.toLocaleString('id-ID');
}

// =====================================================
// ACCESS CONTROL
// =====================================================

/**
 * Check if current user can access AI Insights
 */
export async function checkAIInsightsAccess(): Promise<{
  hasAccess: boolean;
  userId?: string;
  role?: string;
}> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { hasAccess: false };
    }

    // Get user profile with role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return { hasAccess: false, userId: user.id };
    }

    const hasAccess = canAccessAIInsights(profile.role);
    
    return {
      hasAccess,
      userId: user.id,
      role: profile.role,
    };
  } catch (error) {
    console.error('Error checking AI Insights access:', error);
    return { hasAccess: false };
  }
}
