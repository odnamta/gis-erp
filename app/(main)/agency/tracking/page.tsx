'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { TrackingSearch } from '@/components/vessel-tracking/tracking-search';
import { TrackingTimeline } from '@/components/vessel-tracking/tracking-timeline';
import { TrackingProgress, ProgressSummary } from '@/components/vessel-tracking/tracking-progress';
import { PositionMap } from '@/components/vessel-tracking/position-map';
import { SubscriptionForm } from '@/components/vessel-tracking/subscription-form';
import { SubscriptionList, SubscriptionSummary } from '@/components/vessel-tracking/subscription-list';
import {
  TrackingSearchResult,
  TrackingSubscription,
  SubscriptionFormData,
  TRACKING_TYPE_LABELS,
} from '@/types/agency';
import {
  getUserSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
} from '@/app/actions/vessel-tracking-actions';
import {
  Search,
  Bell,
  Ship,
  Package,
  FileText,
  MapPin,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Main tracking page with search, results display, and subscription management.
 * 
 * **Requirements: 5.1-5.6, 6.1-6.6**
 */
export default function TrackingPage() {
  // Search state
  const [searchResult, setSearchResult] = useState<TrackingSearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Subscription state
  const [subscriptions, setSubscriptions] = useState<TrackingSubscription[]>([]);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(true);
  const [showSubscribeDialog, setShowSubscribeDialog] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<'search' | 'subscriptions'>('search');

  // Load user subscriptions on mount
  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    setIsLoadingSubscriptions(true);
    try {
      const data = await getUserSubscriptions();
      setSubscriptions(data);
    } catch {
    } finally {
      setIsLoadingSubscriptions(false);
    }
  };

  // Handle search result
  const handleSearchResult = useCallback((result: TrackingSearchResult | null) => {
    setSearchResult(result);
    setSearchError(null);
  }, []);

  // Handle search start
  const handleSearchStart = useCallback(() => {
    setSearchError(null);
  }, []);

  // Handle search error
  const handleSearchError = useCallback((error: string) => {
    setSearchError(error);
  }, []);

  // Check if current search result is already subscribed
  const isCurrentResultSubscribed = useCallback(() => {
    if (!searchResult) return false;
    
    return subscriptions.some(sub => {
      if (searchResult.type === 'booking' && searchResult.booking) {
        return sub.trackingType === 'booking' && sub.referenceId === searchResult.booking.id;
      }
      if (searchResult.type === 'bl' && searchResult.bl) {
        return sub.trackingType === 'booking' && sub.referenceId === searchResult.bl.id;
      }
      if (searchResult.type === 'container') {
        return sub.trackingType === 'container' && sub.referenceNumber === searchResult.reference;
      }
      return false;
    });
  }, [searchResult, subscriptions]);

  // Handle subscribe to current search result
  const handleSubscribe = async (data: SubscriptionFormData) => {
    setIsSubscribing(true);
    try {
      const result = await createSubscription(data);
      if (result.success && result.data) {
        setSubscriptions(prev => [result.data!, ...prev]);
        setShowSubscribeDialog(false);
      } else {
        throw new Error(result.error || 'Failed to create subscription');
      }
    } catch (error) {
      throw error;
    } finally {
      setIsSubscribing(false);
    }
  };

  // Handle toggle subscription active status
  const handleToggleSubscription = async (id: string, isActive: boolean) => {
    const result = await updateSubscription(id, { isActive });
    if (result.success && result.data) {
      setSubscriptions(prev =>
        prev.map(sub => (sub.id === id ? result.data! : sub))
      );
    } else {
      throw new Error(result.error || 'Failed to update subscription');
    }
  };

  // Handle delete subscription
  const handleDeleteSubscription = async (id: string) => {
    const result = await deleteSubscription(id);
    if (result.success) {
      setSubscriptions(prev => prev.filter(sub => sub.id !== id));
    } else {
      throw new Error(result.error || 'Failed to delete subscription');
    }
  };

  // Get prefilled subscription data from search result
  const getPrefilledSubscriptionData = () => {
    if (!searchResult) return {};

    if (searchResult.type === 'booking' && searchResult.booking) {
      return {
        prefilledType: 'booking' as const,
        prefilledReferenceId: searchResult.booking.id,
        prefilledReferenceNumber: searchResult.booking.bookingNumber,
      };
    }
    if (searchResult.type === 'bl' && searchResult.bl) {
      return {
        prefilledType: 'booking' as const,
        prefilledReferenceId: searchResult.bl.id,
        prefilledReferenceNumber: searchResult.bl.blNumber,
      };
    }
    if (searchResult.type === 'container') {
      return {
        prefilledType: 'container' as const,
        prefilledReferenceId: searchResult.reference,
        prefilledReferenceNumber: searchResult.reference,
      };
    }
    return {};
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shipment Tracking</h1>
          <p className="text-muted-foreground">
            Track shipments by B/L number, booking number, or container number
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'search' | 'subscriptions')}>
        <TabsList>
          <TabsTrigger value="search" className="gap-2">
            <Search className="h-4 w-4" />
            Track Shipment
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-2">
            <Bell className="h-4 w-4" />
            My Subscriptions
            {subscriptions.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {subscriptions.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-6">
          {/* Search Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Track Your Shipment
              </CardTitle>
              <CardDescription>
                Enter a B/L number, booking number, or container number to track your shipment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrackingSearch
                onSearchResult={handleSearchResult}
                onSearchStart={handleSearchStart}
                onSearchError={handleSearchError}
                showResultPreview={false}
                autoFocus
              />
            </CardContent>
          </Card>

          {/* Search Results */}
          {searchResult && (
            <TrackingResults
              result={searchResult}
              isSubscribed={isCurrentResultSubscribed()}
              onSubscribe={() => setShowSubscribeDialog(true)}
            />
          )}

          {/* No Results Message */}
          {searchError && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-amber-800">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">No tracking information found</p>
                    <p className="text-sm mt-1">
                      Please check the reference number and try again. Make sure you&apos;re using the correct format.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-6">
          {/* Subscription Summary */}
          {subscriptions.length > 0 && (
            <div className="grid gap-4 md:grid-cols-3">
              <SubscriptionSummary subscriptions={subscriptions} className="md:col-span-1" />
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">About Tracking Subscriptions</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    Subscribe to shipments to receive notifications about important events like departures, arrivals, and delays.
                  </p>
                  <p>
                    You can manage your notification preferences for each subscription individually.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Subscription List */}
          {isLoadingSubscriptions ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : (
            <SubscriptionList
              subscriptions={subscriptions}
              onToggleActive={handleToggleSubscription}
              onDelete={handleDeleteSubscription}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Subscribe Dialog */}
      <Dialog open={showSubscribeDialog} onOpenChange={setShowSubscribeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Subscribe to Tracking Updates
            </DialogTitle>
            <DialogDescription>
              Get notified about important events for this shipment
            </DialogDescription>
          </DialogHeader>
          <SubscriptionForm
            onSubmit={handleSubscribe}
            onCancel={() => setShowSubscribeDialog(false)}
            isLoading={isSubscribing}
            hideReferenceFields
            {...getPrefilledSubscriptionData()}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}


/**
 * Tracking results display component.
 * Shows timeline, progress indicator, and vessel position map.
 * 
 * **Requirements: 4.6, 5.4, 5.5, 5.6**
 */
interface TrackingResultsProps {
  result: TrackingSearchResult;
  isSubscribed: boolean;
  onSubscribe: () => void;
}

function TrackingResults({ result, isSubscribed, onSubscribe }: TrackingResultsProps) {
  // Get icon for search result type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'vessel':
        return <Ship className="h-5 w-5" />;
      case 'container':
        return <Package className="h-5 w-5" />;
      case 'booking':
        return <FileText className="h-5 w-5" />;
      case 'bl':
        return <FileText className="h-5 w-5" />;
      default:
        return <Search className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Result Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                {getTypeIcon(result.type)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="capitalize">
                    {result.type === 'bl' ? 'Bill of Lading' : (TRACKING_TYPE_LABELS[result.type as keyof typeof TRACKING_TYPE_LABELS] || result.type)}
                  </Badge>
                  <span className="font-mono text-lg font-semibold">{result.reference}</span>
                </div>

                {/* Booking Info */}
                {result.booking && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Booking: {result.booking.bookingNumber}
                    {result.booking.cargoDescription && (
                      <span className="ml-2">• {result.booking.cargoDescription}</span>
                    )}
                  </p>
                )}

                {/* B/L Info */}
                {result.bl && (
                  <p className="text-sm text-muted-foreground mt-1">
                    B/L: {result.bl.blNumber}
                    {result.bl.cargoDescription && (
                      <span className="ml-2">• {result.bl.cargoDescription}</span>
                    )}
                  </p>
                )}

                {/* Vessel Info */}
                {result.vessel && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <Ship className="h-4 w-4" />
                    {result.vessel.name}
                    {result.vessel.voyage && ` / Voyage ${result.vessel.voyage}`}
                  </p>
                )}
              </div>
            </div>

            {/* Subscribe Button */}
            <Button
              variant={isSubscribed ? 'secondary' : 'default'}
              onClick={onSubscribe}
              disabled={isSubscribed}
              className="gap-2"
            >
              <Bell className={cn('h-4 w-4', isSubscribed && 'fill-current')} />
              {isSubscribed ? 'Subscribed' : 'Subscribe to Updates'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Indicator */}
          {result.events.length > 0 && (
            <TrackingProgress
              events={result.events}
              title="Shipment Progress"
            />
          )}

          {/* Timeline */}
          <TrackingTimeline
            events={result.events}
            title="Tracking Events"
          />
        </div>

        {/* Right Column: Map and Summary */}
        <div className="space-y-6">
          {/* Vessel Position Map */}
          {result.vessel?.position && (
            <PositionMap
              position={result.vessel.position}
              title="Current Vessel Position"
            />
          )}

          {/* No Position Available */}
          {result.vessel && !result.vessel.position && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Vessel Position
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4 text-muted-foreground">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Position data not available</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Events</p>
                  <p className="font-medium text-lg">{result.events.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Actual Events</p>
                  <p className="font-medium text-lg">
                    {result.events.filter(e => e.isActual).length}
                  </p>
                </div>
              </div>

              {result.events.length > 0 && (
                <>
                  <div className="border-t pt-4">
                    <p className="text-xs text-muted-foreground mb-1">Latest Event</p>
                    <p className="font-medium">
                      {result.events[result.events.length - 1]?.eventType.replace(/_/g, ' ')}
                    </p>
                    {result.events[result.events.length - 1]?.locationName && (
                      <p className="text-sm text-muted-foreground">
                        {result.events[result.events.length - 1]?.locationName}
                      </p>
                    )}
                  </div>

                  {/* Progress Summary */}
                  <div className="border-t pt-4">
                    <ProgressSummary events={result.events} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
