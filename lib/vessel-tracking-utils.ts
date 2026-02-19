// =====================================================
// v0.74: AGENCY - VESSEL TRACKING & SCHEDULES UTILITIES
// =====================================================

import {
  Vessel,
  Port,
  VesselSchedule,
  VesselPositionRecord,
  ShipmentTracking,
  TrackingSubscription,
  UpcomingArrival,
  MilestoneProgress,
  VesselRow,
  VesselScheduleRow,
  VesselPositionRow,
  ShipmentTrackingRow,
  TrackingSubscriptionRow,
  UpcomingArrivalRow,
  VesselType,
  VesselStatus,
  ScheduleType,
  ScheduleStatus,
  TrackingEventType,
  TrackingType,
  PositionSource,
  TRACKING_EVENT_TYPES,
  ValidationResult,
  ValidationError,
} from '@/types/agency';

// Re-export validateContainerNumber from bl-documentation-utils
export { validateContainerNumber } from './bl-documentation-utils';

// =====================================================
// VALIDATION FUNCTIONS
// =====================================================

/**
 * Validate IMO number format
 * IMO numbers must be exactly 7 digits
 * @param imo - IMO number to validate
 * @returns ValidationResult with isValid flag and errors array
 * 
 * **Validates: Requirements 9.1**
 */
export function validateIMO(imo: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!imo || typeof imo !== 'string') {
    errors.push({ field: 'imoNumber', message: 'IMO number is required' });
    return { isValid: false, errors };
  }

  // IMO must be exactly 7 digits
  const pattern = /^\d{7}$/;
  if (!pattern.test(imo)) {
    errors.push({ field: 'imoNumber', message: 'IMO number must be exactly 7 digits' });
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate MMSI format
 * MMSI must be exactly 9 digits
 * @param mmsi - MMSI to validate
 * @returns ValidationResult with isValid flag and errors array
 * 
 * **Validates: Requirements 9.2**
 */
export function validateMMSI(mmsi: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!mmsi || typeof mmsi !== 'string') {
    errors.push({ field: 'mmsi', message: 'MMSI is required' });
    return { isValid: false, errors };
  }

  // MMSI must be exactly 9 digits
  const pattern = /^\d{9}$/;
  if (!pattern.test(mmsi)) {
    errors.push({ field: 'mmsi', message: 'MMSI must be exactly 9 digits' });
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate geographic coordinates
 * Latitude must be between -90 and 90
 * Longitude must be between -180 and 180
 * @param lat - Latitude value
 * @param lng - Longitude value
 * @returns ValidationResult with isValid flag and errors array
 * 
 * **Validates: Requirements 9.3, 9.4**
 */
export function validateCoordinates(lat: number, lng: number): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof lat !== 'number' || isNaN(lat)) {
    errors.push({ field: 'latitude', message: 'Latitude must be a valid number' });
  } else if (lat < -90 || lat > 90) {
    errors.push({ field: 'latitude', message: 'Latitude must be between -90 and 90' });
  }

  if (typeof lng !== 'number' || isNaN(lng)) {
    errors.push({ field: 'longitude', message: 'Longitude must be a valid number' });
  } else if (lng < -180 || lng > 180) {
    errors.push({ field: 'longitude', message: 'Longitude must be between -180 and 180' });
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate navigation data (course and speed)
 * Speed must be non-negative
 * Course must be between 0 and 360 degrees
 * @param course - Course in degrees
 * @param speed - Speed in knots
 * @returns ValidationResult with isValid flag and errors array
 * 
 * **Validates: Requirements 9.5, 9.6**
 */
export function validateNavigationData(course: number, speed: number): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof speed !== 'number' || isNaN(speed)) {
    errors.push({ field: 'speed', message: 'Speed must be a valid number' });
  } else if (speed < 0) {
    errors.push({ field: 'speed', message: 'Speed cannot be negative' });
  }

  if (typeof course !== 'number' || isNaN(course)) {
    errors.push({ field: 'course', message: 'Course must be a valid number' });
  } else if (course < 0 || course > 360) {
    errors.push({ field: 'course', message: 'Course must be between 0 and 360 degrees' });
  }

  return { isValid: errors.length === 0, errors };
}


// =====================================================
// CALCULATION FUNCTIONS
// =====================================================

/**
 * Calculate delay in hours between scheduled and actual times
 * Positive values indicate late arrival, negative values indicate early arrival
 * @param scheduled - Scheduled time (ISO string or Date)
 * @param actual - Actual time (ISO string or Date)
 * @returns Delay in hours (positive = late, negative = early)
 * 
 * **Validates: Requirements 2.6, 8.1**
 */
export function calculateDelayHours(scheduled: Date | string, actual: Date | string): number {
  const scheduledDate = scheduled instanceof Date ? scheduled : new Date(scheduled);
  const actualDate = actual instanceof Date ? actual : new Date(actual);

  if (isNaN(scheduledDate.getTime()) || isNaN(actualDate.getTime())) {
    return 0;
  }

  const diffMs = actualDate.getTime() - scheduledDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  // Round to 1 decimal place
  return Math.round(diffHours * 10) / 10;
}

/**
 * Calculate time since last position update
 * @param lastUpdate - Last update timestamp (ISO string or Date)
 * @returns Human-readable string (e.g., "2 hours ago", "5 minutes ago")
 * 
 * **Validates: Requirements 3.6**
 */
export function calculateTimeSinceUpdate(lastUpdate: Date | string): string {
  const updateDate = lastUpdate instanceof Date ? lastUpdate : new Date(lastUpdate);
  const now = new Date();

  if (isNaN(updateDate.getTime())) {
    return 'Unknown';
  }

  const diffMs = now.getTime() - updateDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }
}

/**
 * Calculate milestone progress from tracking events
 * @param events - Array of tracking events
 * @returns MilestoneProgress with current, completed, and pending milestones
 * 
 * **Validates: Requirements 8.1**
 */
export function calculateMilestoneProgress(events: ShipmentTracking[]): MilestoneProgress {
  // Define the standard milestone order
  const milestoneOrder: TrackingEventType[] = TRACKING_EVENT_TYPES;

  // Get completed milestones (actual events only)
  const completedMilestones = events
    .filter(e => e.isActual)
    .map(e => e.eventType)
    .filter((type, index, self) => self.indexOf(type) === index); // unique

  // Find the current milestone (last completed)
  const currentMilestone = completedMilestones.length > 0
    ? completedMilestones[completedMilestones.length - 1]
    : 'booked';

  // Calculate pending milestones
  const currentIndex = milestoneOrder.indexOf(currentMilestone);
  const pendingMilestones = milestoneOrder.slice(currentIndex + 1);

  // Calculate progress percentage
  const totalMilestones = milestoneOrder.length;
  const completedCount = completedMilestones.length;
  const progressPercent = Math.round((completedCount / totalMilestones) * 100);

  return {
    currentMilestone,
    completedMilestones,
    pendingMilestones,
    progressPercent,
  };
}


// =====================================================
// TRANSFORMATION FUNCTIONS
// =====================================================

/**
 * Transform Vessel model to database row format
 * @param vessel - Vessel model object
 * @returns VesselRow for database insertion
 */
export function vesselToRow(vessel: Partial<Vessel>): Partial<VesselRow> {
  return {
    id: vessel.id,
    imo_number: vessel.imoNumber,
    mmsi: vessel.mmsi,
    vessel_name: vessel.vesselName,
    vessel_type: vessel.vesselType,
    flag: vessel.flag,
    call_sign: vessel.callSign,
    length_m: vessel.lengthM,
    beam_m: vessel.beamM,
    draft_m: vessel.draftM,
    gross_tonnage: vessel.grossTonnage,
    deadweight_tons: vessel.deadweightTons,
    teu_capacity: vessel.teuCapacity,
    owner: vessel.owner,
    operator: vessel.operator,
    shipping_line_id: vessel.shippingLineId,
    current_status: vessel.currentStatus,
    current_position: vessel.currentPosition,
    last_port: vessel.lastPort,
    next_port: vessel.nextPort,
    is_active: vessel.isActive,
    created_at: vessel.createdAt,
    updated_at: vessel.updatedAt,
  };
}

/**
 * Transform database row to Vessel model
 * @param row - VesselRow from database
 * @returns Vessel model object
 */
export function rowToVessel(row: VesselRow): Vessel {
  return {
    id: row.id,
    imoNumber: row.imo_number,
    mmsi: row.mmsi,
    vesselName: row.vessel_name,
    vesselType: row.vessel_type as VesselType | undefined,
    flag: row.flag,
    callSign: row.call_sign,
    lengthM: row.length_m,
    beamM: row.beam_m,
    draftM: row.draft_m,
    grossTonnage: row.gross_tonnage,
    deadweightTons: row.deadweight_tons,
    teuCapacity: row.teu_capacity,
    owner: row.owner,
    operator: row.operator,
    shippingLineId: row.shipping_line_id,
    currentStatus: row.current_status as VesselStatus | undefined,
    currentPosition: row.current_position,
    lastPort: row.last_port,
    nextPort: row.next_port,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Transform VesselSchedule model to database row format
 * @param schedule - VesselSchedule model object
 * @returns VesselScheduleRow for database insertion
 */
export function scheduleToRow(schedule: Partial<VesselSchedule>): Partial<VesselScheduleRow> {
  return {
    id: schedule.id,
    vessel_id: schedule.vesselId,
    voyage_number: schedule.voyageNumber,
    service_name: schedule.serviceName,
    service_code: schedule.serviceCode,
    schedule_type: schedule.scheduleType,
    port_id: schedule.portId,
    port_name: schedule.portName,
    terminal: schedule.terminal,
    berth: schedule.berth,
    scheduled_arrival: schedule.scheduledArrival,
    scheduled_departure: schedule.scheduledDeparture,
    actual_arrival: schedule.actualArrival,
    actual_departure: schedule.actualDeparture,
    cargo_cutoff: schedule.cargoCutoff,
    doc_cutoff: schedule.docCutoff,
    vgm_cutoff: schedule.vgmCutoff,
    status: schedule.status,
    delay_hours: schedule.delayHours,
    delay_reason: schedule.delayReason,
    notes: schedule.notes,
    created_at: schedule.createdAt,
    updated_at: schedule.updatedAt,
  };
}

/**
 * Transform database row to VesselSchedule model
 * @param row - VesselScheduleRow from database
 * @returns VesselSchedule model object
 */
export function rowToSchedule(row: VesselScheduleRow & { vessels?: Record<string, unknown>; ports?: Record<string, unknown> }): VesselSchedule {
  const schedule: VesselSchedule = {
    id: row.id,
    vesselId: row.vessel_id,
    voyageNumber: row.voyage_number,
    serviceName: row.service_name,
    serviceCode: row.service_code,
    scheduleType: row.schedule_type as ScheduleType,
    portId: row.port_id,
    portName: row.port_name,
    terminal: row.terminal,
    berth: row.berth,
    scheduledArrival: row.scheduled_arrival,
    scheduledDeparture: row.scheduled_departure,
    actualArrival: row.actual_arrival,
    actualDeparture: row.actual_departure,
    cargoCutoff: row.cargo_cutoff,
    docCutoff: row.doc_cutoff,
    vgmCutoff: row.vgm_cutoff,
    status: row.status as ScheduleStatus,
    delayHours: row.delay_hours,
    delayReason: row.delay_reason,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  // Map joined vessel relation
  if (row.vessels) {
    const v = row.vessels as Record<string, string>;
    schedule.vessel = {
      id: v.id,
      vesselName: v.vessel_name,
      imoNumber: v.imo_number,
      vesselType: v.vessel_type as VesselType,
    } as Vessel;
  }

  // Map joined port relation
  if (row.ports) {
    const p = row.ports as Record<string, string>;
    schedule.port = {
      id: p.id,
      portCode: p.port_code,
      portName: p.port_name,
    } as Port;
  }

  return schedule;
}

/**
 * Transform VesselPositionRecord model to database row format
 * @param position - VesselPositionRecord model object
 * @returns VesselPositionRow for database insertion
 */
export function positionToRow(position: Partial<VesselPositionRecord>): Partial<VesselPositionRow> {
  return {
    id: position.id,
    vessel_id: position.vesselId,
    timestamp: position.timestamp,
    latitude: position.latitude,
    longitude: position.longitude,
    course: position.course,
    speed_knots: position.speedKnots,
    status: position.status,
    destination: position.destination,
    source: position.source,
    created_at: position.createdAt,
  };
}

/**
 * Transform database row to VesselPositionRecord model
 * @param row - VesselPositionRow from database
 * @returns VesselPositionRecord model object
 */
export function rowToPosition(row: VesselPositionRow): VesselPositionRecord {
  return {
    id: row.id,
    vesselId: row.vessel_id,
    timestamp: row.timestamp,
    latitude: row.latitude,
    longitude: row.longitude,
    course: row.course,
    speedKnots: row.speed_knots,
    status: row.status as VesselStatus | undefined,
    destination: row.destination,
    source: row.source as PositionSource,
    createdAt: row.created_at,
  };
}

/**
 * Transform ShipmentTracking model to database row format
 * @param tracking - ShipmentTracking model object
 * @returns ShipmentTrackingRow for database insertion
 */
export function trackingToRow(tracking: Partial<ShipmentTracking>): Partial<ShipmentTrackingRow> {
  return {
    id: tracking.id,
    booking_id: tracking.bookingId,
    bl_id: tracking.blId,
    container_id: tracking.containerId,
    tracking_number: tracking.trackingNumber,
    container_number: tracking.containerNumber,
    event_type: tracking.eventType,
    event_timestamp: tracking.eventTimestamp,
    location_name: tracking.locationName,
    location_code: tracking.locationCode,
    terminal: tracking.terminal,
    vessel_name: tracking.vesselName,
    voyage_number: tracking.voyageNumber,
    description: tracking.description,
    is_actual: tracking.isActual,
    source: tracking.source,
    created_at: tracking.createdAt,
  };
}

/**
 * Transform database row to ShipmentTracking model
 * @param row - ShipmentTrackingRow from database
 * @returns ShipmentTracking model object
 */
export function rowToTracking(row: ShipmentTrackingRow): ShipmentTracking {
  return {
    id: row.id,
    bookingId: row.booking_id,
    blId: row.bl_id,
    containerId: row.container_id,
    trackingNumber: row.tracking_number,
    containerNumber: row.container_number,
    eventType: row.event_type as TrackingEventType,
    eventTimestamp: row.event_timestamp,
    locationName: row.location_name,
    locationCode: row.location_code,
    terminal: row.terminal,
    vesselName: row.vessel_name,
    voyageNumber: row.voyage_number,
    description: row.description,
    isActual: row.is_actual,
    source: row.source,
    createdAt: row.created_at,
  };
}

/**
 * Transform TrackingSubscription model to database row format
 * @param subscription - TrackingSubscription model object
 * @returns TrackingSubscriptionRow for database insertion
 */
export function subscriptionToRow(subscription: Partial<TrackingSubscription>): Partial<TrackingSubscriptionRow> {
  return {
    id: subscription.id,
    tracking_type: subscription.trackingType,
    reference_id: subscription.referenceId,
    reference_number: subscription.referenceNumber,
    user_id: subscription.userId,
    email: subscription.email,
    notify_departure: subscription.notifyDeparture,
    notify_arrival: subscription.notifyArrival,
    notify_delay: subscription.notifyDelay,
    notify_milestone: subscription.notifyMilestone,
    is_active: subscription.isActive,
    created_at: subscription.createdAt,
  };
}

/**
 * Transform database row to TrackingSubscription model
 * @param row - TrackingSubscriptionRow from database
 * @returns TrackingSubscription model object
 */
export function rowToSubscription(row: TrackingSubscriptionRow): TrackingSubscription {
  return {
    id: row.id,
    trackingType: row.tracking_type as TrackingType,
    referenceId: row.reference_id,
    referenceNumber: row.reference_number,
    userId: row.user_id,
    email: row.email,
    notifyDeparture: row.notify_departure,
    notifyArrival: row.notify_arrival,
    notifyDelay: row.notify_delay,
    notifyMilestone: row.notify_milestone,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

/**
 * Transform database row to UpcomingArrival model
 * @param row - UpcomingArrivalRow from database view
 * @returns UpcomingArrival model object
 */
export function rowToUpcomingArrival(row: UpcomingArrivalRow): UpcomingArrival {
  return {
    id: row.id,
    vesselId: row.vessel_id,
    vesselName: row.vessel_name,
    imoNumber: row.imo_number,
    vesselType: row.vessel_type as VesselType | undefined,
    voyageNumber: row.voyage_number,
    portName: row.port_name,
    portCode: row.port_code,
    terminal: row.terminal,
    scheduledArrival: row.scheduled_arrival,
    status: row.status as ScheduleStatus,
    delayHours: row.delay_hours,
    ourBookingsCount: row.our_bookings_count,
  };
}


// =====================================================
// FILTER AND SORT FUNCTIONS
// =====================================================

/**
 * Filter schedules by delay status
 * @param schedules - Array of VesselSchedule to filter
 * @param hasDelay - If true, return only schedules with delay > 0; if false, return only schedules with no delay
 * @returns Filtered array of VesselSchedule
 * 
 * **Validates: Requirements 8.4**
 */
export function filterSchedulesByDelay(schedules: VesselSchedule[], hasDelay: boolean): VesselSchedule[] {
  if (!schedules || !Array.isArray(schedules)) {
    return [];
  }

  return schedules.filter(schedule => {
    const isDelayed = schedule.delayHours > 0;
    return hasDelay ? isDelayed : !isDelayed;
  });
}

/**
 * Filter upcoming arrivals by date range
 * @param arrivals - Array of UpcomingArrival to filter
 * @param from - Start date (inclusive)
 * @param to - End date (inclusive)
 * @returns Filtered array of UpcomingArrival within the date range
 * 
 * **Validates: Requirements 7.5**
 */
export function filterArrivalsByDateRange(
  arrivals: UpcomingArrival[],
  from: Date | string,
  to: Date | string
): UpcomingArrival[] {
  if (!arrivals || !Array.isArray(arrivals)) {
    return [];
  }

  const fromDate = from instanceof Date ? from : new Date(from);
  const toDate = to instanceof Date ? to : new Date(to);

  // Set to start of day for from and end of day for to
  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(23, 59, 59, 999);

  return arrivals.filter(arrival => {
    const arrivalDate = new Date(arrival.scheduledArrival);
    return arrivalDate >= fromDate && arrivalDate <= toDate;
  });
}

/**
 * Sort upcoming arrivals by scheduled arrival time (ascending)
 * @param arrivals - Array of UpcomingArrival to sort
 * @returns Sorted array of UpcomingArrival
 * 
 * **Validates: Requirements 7.6**
 */
export function sortArrivalsByTime(arrivals: UpcomingArrival[]): UpcomingArrival[] {
  if (!arrivals || !Array.isArray(arrivals)) {
    return [];
  }

  return [...arrivals].sort((a, b) => {
    const dateA = new Date(a.scheduledArrival).getTime();
    const dateB = new Date(b.scheduledArrival).getTime();
    return dateA - dateB;
  });
}

/**
 * Sort tracking events by timestamp (ascending - chronological order)
 * @param events - Array of ShipmentTracking to sort
 * @returns Sorted array of ShipmentTracking in chronological order
 * 
 * **Validates: Requirements 4.6**
 */
export function sortTrackingEventsByTimestamp(events: ShipmentTracking[]): ShipmentTracking[] {
  if (!events || !Array.isArray(events)) {
    return [];
  }

  return [...events].sort((a, b) => {
    const dateA = new Date(a.eventTimestamp).getTime();
    const dateB = new Date(b.eventTimestamp).getTime();
    return dateA - dateB;
  });
}
