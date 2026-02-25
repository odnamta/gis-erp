// =====================================================
// BARREL RE-EXPORT: vessel-tracking-actions.ts
// Split into: vessel-actions.ts, shipment-tracking-actions.ts, tracking-subscription-actions.ts
// This file re-exports everything for backward compatibility.
// =====================================================

export {
  createVessel,
  updateVessel,
  deleteVessel,
  getVessel,
  getVessels,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getSchedule,
  getSchedules,
  getUpcomingArrivals,
} from './vessel-actions';

export {
  recordTrackingEvent,
  getTrackingEvents,
  searchTracking,
  getTrackingEvent,
  deleteTrackingEvent,
  recordPosition,
  getPositionHistory,
} from './shipment-tracking-actions';

export {
  createSubscription,
  updateSubscription,
  deleteSubscription,
  getUserSubscriptions,
  getSubscription,
  getSubscriptionsByReference,
} from './tracking-subscription-actions';
