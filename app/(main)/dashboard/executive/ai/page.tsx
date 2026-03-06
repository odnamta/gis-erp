'use client';

import { useState, useEffect, useCallback } from 'react';
import { redirect } from 'next/navigation';
import { Sparkles, Settings, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AIQueryInput,
  AIQueryResponseDisplay,
  AIQueryHistoryList,
} from '@/components/ai-insights';
import type { AIQueryResponse, AIQueryHistory } from '@/types/ai-insights';
import {
  processAIQuery,
  getQueryHistory,
  updateQueryFeedback,
  checkAIInsightsAccess,
} from '@/lib/ai-insights-actions';

export default function AIInsightsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AIQueryResponse | null>(null);
  const [history, setHistory] = useState<AIQueryHistory[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [lastQueryId, setLastQueryId] = useState<string | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);

  // Check access on mount
  useEffect(() => {
    async function checkAccess() {
      const access = await checkAIInsightsAccess();
      if (!access.hasAccess) {
        redirect('/dashboard');
      }
      setUserId(access.userId || null);
      setAccessChecked(true);
    }
    checkAccess();
  }, []);

  // Load history when userId is available
  useEffect(() => {
    async function loadHistory() {
      if (!userId) return;
      const historyData = await getQueryHistory(userId);
      setHistory(historyData);
    }
    loadHistory();
  }, [userId]);

  const handleSubmit = useCallback(async (query: string) => {
    if (!userId) return;
    
    setIsLoading(true);
    setResponse(null);
    
    try {
      const result = await processAIQuery(query, userId);
      setResponse(result);
      
      // Refresh history
      const historyData = await getQueryHistory(userId);
      setHistory(historyData);
      
      // Store the latest query ID for feedback
      if (historyData.length > 0) {
        setLastQueryId(historyData[0].id);
      }
    } catch {
      setResponse({
        responseType: 'error',
        responseText: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const handleFeedback = useCallback(async (helpful: boolean, notes?: string) => {
    if (!lastQueryId) return;
    
    await updateQueryFeedback(lastQueryId, helpful, notes);
    
    // Refresh history to show feedback
    if (userId) {
      const historyData = await getQueryHistory(userId);
      setHistory(historyData);
    }
  }, [lastQueryId, userId]);

  const handleRerun = useCallback((query: string) => {
    handleSubmit(query);
  }, [handleSubmit]);

  if (!accessChecked) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">
          Checking access...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Insights</h1>
            <p className="text-sm text-muted-foreground">
              Ask questions about your business in plain English
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <History className="h-4 w-4 mr-2" />
            History
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Query Input */}
      <AIQueryInput
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />

      {/* Response */}
      {response && (
        <AIQueryResponseDisplay
          response={response}
          onFeedback={handleFeedback}
        />
      )}

      {/* History */}
      <AIQueryHistoryList
        history={history}
        onRerun={handleRerun}
        isLoading={isLoading}
      />
    </div>
  );
}
