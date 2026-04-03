/**
 * Webhook System
 *
 * Fire-and-forget webhook notifications to external systems (e.g., Takeoff)
 * Errors are logged but never block the calling operation.
 */

const WEBHOOK_URL = process.env.TAKEOFF_WEBHOOK_URL || process.env.OPS_WEBHOOK_URL || 'https://flight.knabe-gmbh.de/api/webhook/ops'
const WEBHOOK_KEY = process.env.OPS_WEBHOOK_KEY || process.env.SHOP_API_KEY

type WebhookEvent = 'booking.cancelled' | 'booking.updated' | 'booking.deleted'

interface BookingPayload {
  id: string
  shopOrderNumber?: string | null
  shopBookingId?: string | null
  status: string
  title?: string
  startTime?: string
  endTime?: string
  duration?: number
  customer?: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
  }
  cancellationReason?: string | null
  cancellationNote?: string | null
}

/**
 * Send webhook notification — fire-and-forget
 * Never throws, never blocks the caller.
 */
export function sendWebhook(event: WebhookEvent, booking: BookingPayload) {
  if (!WEBHOOK_KEY) {
    console.log(`[Webhook] Skipped ${event} — no API key configured`)
    return
  }

  // Fire and forget — don't await
  fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': WEBHOOK_KEY,
    },
    body: JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      booking,
    }),
    signal: AbortSignal.timeout(10000), // 10s timeout
  })
    .then(res => {
      if (res.ok) {
        console.log(`[Webhook] ${event} sent for ${booking.id} (${booking.shopOrderNumber || 'no order'})`)
      } else {
        console.error(`[Webhook] ${event} failed: ${res.status} ${res.statusText}`)
      }
    })
    .catch(err => {
      console.error(`[Webhook] ${event} error:`, err.message)
    })
}

/**
 * Helper: Build booking payload from a calendar_events row
 */
export function buildBookingPayload(event: any): BookingPayload {
  return {
    id: event.id,
    shopOrderNumber: event.shop_order_number,
    shopBookingId: event.shop_booking_id,
    status: event.status,
    title: event.title,
    startTime: event.start_time,
    endTime: event.end_time,
    duration: event.duration,
    customer: {
      firstName: event.customer_first_name,
      lastName: event.customer_last_name,
      email: event.customer_email,
      phone: event.customer_phone,
    },
    cancellationReason: event.cancellation_reason,
    cancellationNote: event.cancellation_note,
  }
}
