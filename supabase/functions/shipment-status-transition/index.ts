// shipment-status-transition — POST
// Change booking status with validation against allowed transitions.
// Ported from lib/booking-utils.ts VALID_STATUS_TRANSITIONS (lines 24-54)

import { corsHeaders, handleCorsOptions } from '../_shared/cors.ts'
import { createUserClient, createServiceClient } from '../_shared/supabase.ts'
import { getUserProfile } from '../_shared/auth.ts'
import { logAudit } from '../_shared/audit.ts'

type BookingStatus = 'draft' | 'requested' | 'confirmed' | 'amended' | 'cancelled' | 'shipped' | 'completed'

const VALID_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  draft: ['requested', 'cancelled'],
  requested: ['confirmed', 'cancelled'],
  confirmed: ['amended', 'shipped', 'cancelled'],
  amended: ['shipped', 'cancelled'],
  cancelled: [],
  shipped: ['completed'],
  completed: [],
}

const ALL_STATUSES = Object.keys(VALID_STATUS_TRANSITIONS) as BookingStatus[]

interface RequestBody {
  booking_id: string
  new_status: BookingStatus
  notes?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsOptions()

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Auth
    const { profile, authHeader } = await getUserProfile(req)
    const supabase = createUserClient(authHeader)
    const serviceClient = createServiceClient()

    // 2. Parse + validate request
    const body: RequestBody = await req.json()
    const { booking_id, new_status, notes } = body

    if (!booking_id || !new_status) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: booking_id, new_status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!ALL_STATUSES.includes(new_status)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid status '${new_status}'. Valid: ${ALL_STATUSES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Fetch current booking
    const { data: booking, error: fetchError } = await supabase
      .from('freight_bookings')
      .select('id, status, booking_number')
      .eq('id', booking_id)
      .single()

    if (fetchError || !booking) {
      return new Response(
        JSON.stringify({ success: false, error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const currentStatus = booking.status as BookingStatus
    const bookingNumber = booking.booking_number as string || booking_id

    // 4. Validate transition
    const allowed = VALID_STATUS_TRANSITIONS[currentStatus] || []
    if (!allowed.includes(new_status)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Cannot transition from '${currentStatus}' to '${new_status}'. Allowed: ${allowed.length > 0 ? allowed.join(', ') : 'none (terminal state)'}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Update status
    const { error: updateError } = await supabase
      .from('freight_bookings')
      .update({
        status: new_status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking_id)

    if (updateError) {
      return new Response(
        JSON.stringify({ success: false, error: `Update failed: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Audit log
    await logAudit(serviceClient, profile, {
      action: 'update',
      module: 'agency',
      recordId: booking_id,
      recordType: 'BOOKING',
      recordNumber: bookingNumber,
      oldValues: { status: currentStatus },
      newValues: { status: new_status },
      changesSummary: `Booking ${bookingNumber} status: ${currentStatus} → ${new_status}${notes ? ` (${notes})` : ''}`,
    })

    return new Response(
      JSON.stringify({
        success: true,
        old_status: currentStatus,
        new_status,
        booking_number: bookingNumber,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status = message.includes('Authorization') || message.includes('token') ? 401 : 500

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
