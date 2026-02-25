// =====================================================
// BARREL RE-EXPORT: booking-actions.ts
// Split into: booking-core-actions.ts, booking-container-actions.ts,
//             booking-amendment-actions.ts, booking-rate-actions.ts
// This file re-exports everything for backward compatibility.
// =====================================================

export {
  createBooking,
  updateBooking,
  getBooking,
  getBookings,
  deleteBooking,
  submitBookingRequest,
  confirmBooking,
  cancelBooking,
  markAsShipped,
  completeBooking,
  getStatusHistory,
  getBookingStats,
} from './booking-core-actions';

export {
  addContainer,
  updateContainer,
  removeContainer,
  getBookingContainers,
} from './booking-container-actions';

export {
  requestAmendment,
  approveAmendment,
  rejectAmendment,
  getBookingAmendments,
} from './booking-amendment-actions';

export {
  lookupRates,
  calculateFreight,
} from './booking-rate-actions';
