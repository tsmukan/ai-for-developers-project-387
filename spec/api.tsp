import "@typespec/http";

using TypeSpec.Http;

// ============================================================================
// Aliases & Enums
// ============================================================================

alias Timezone = string;   // IANA timezone, e.g. "Europe/Moscow", "America/New_York"
alias TimeString = string; // "HH:mm" format, e.g. "09:00", "17:30"
alias DateTime = utcDateTime;
alias Uuid = string;

// ============================================================================
// Error model
// ============================================================================

@error
model ErrorBody {
  message: string;
  details?: string;
}

// ============================================================================
// Model: EventType
// ============================================================================

model EventType {
  id: Uuid;
  title: string;
  description: string;
  durationInMinutes: int32;
}

model EventTypeCreate {
  title: string;
  description: string;
  @minValue(1)
  durationInMinutes: int32;
}

model EventTypeUpdate {
  title?: string;
  description?: string;
  @minValue(1)
  durationInMinutes?: int32;
}

// ============================================================================
// Model: WorkingHours
// ============================================================================

enum DayOfWeek {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

model WorkingHoursEntry {
  dayOfWeek: DayOfWeek;
  startTime: TimeString;
  endTime: TimeString;
  isAvailable: boolean;
}

model WorkingHoursConfig {
  entries: WorkingHoursEntry[];
}

// ============================================================================
// Model: Owner Profile
// ============================================================================

model OwnerProfile {
  name: string;
  email: string;
  timezone: Timezone;
}

// ============================================================================
// Model: Booking
// ============================================================================

model Booking {
  id: Uuid;
  eventTypeId: Uuid;
  startTime: DateTime;
  endTime: DateTime;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  guestTimezone: Timezone;
  createdAt: DateTime;
}

model BookingCreate {
  startTime: DateTime;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  guestTimezone: Timezone;
}

// ============================================================================
// Model: Slot (available time window)
// ============================================================================

model Slot {
  startTime: DateTime;
  endTime: DateTime;
}

// ============================================================================
// Responses
// ============================================================================

model BookingsList {
  items: Booking[];
  total: int32;
}

model EventTypesList {
  items: EventType[];
}

model SlotsList {
  items: Slot[];
  timezone: Timezone;
}

// ============================================================================
// Service
// ============================================================================

@service(#{ title: "Calendar Booking" })
namespace CalendarBooking {

  // ── Public (Guest) API ───────────────────────────────────────────────────

  @route("/event-types")
  namespace PublicEventTypes {

    /** Get all event types visible to guests */
    @get
    op listEventTypes(): EventTypesList | ErrorBody;

    /** Get available slots for a specific event type within the booking window (today + 14 days) */
    @route("{eventTypeId}/slots")
    @get
    op listSlots(
      @path eventTypeId: Uuid,
      @query timezone: Timezone,
      @query dateFrom?: string, // "YYYY-MM-DD", default: today
      @query dateTo?: string,   // "YYYY-MM-DD", default: today + 14 days
    ): SlotsList | ErrorBody;

    /**
     * Create a booking on a selected slot.
     *
     * Server-side rules:
     * - `endTime` is computed as `startTime + eventType.durationInMinutes`
     * - `startTime` must align to a 30-minute grid (:00 or :30)
     * - `startTime` must fall within today..today+14 days
     * - The resulting [startTime, endTime) range must NOT overlap with any
     *   existing booking, regardless of event type.
     */
    @route("{eventTypeId}/bookings")
    @post
    op createBooking(
      @path eventTypeId: Uuid,
      @body body: BookingCreate,
    ): {
      @statusCode statusCode: 201;
      @body booking: Booking;
    } | ErrorBody;
  }

  // ── Owner (Admin) API ────────────────────────────────────────────────────

  @route("/owner")
  namespace Owner {

    // ── Event Types ────────────────────────────────────────────────────────

    @route("event-types")
    @get
    op listEventTypes(): EventTypesList | ErrorBody;

    @route("event-types/{eventTypeId}")
    @get
    op getEventType(
      @path eventTypeId: Uuid,
    ): EventType | ErrorBody;

    @route("event-types")
    @post
    op createEventType(@body body: EventTypeCreate): {
      @statusCode statusCode: 201;
      @body eventType: EventType;
    } | ErrorBody;

    @route("event-types/{eventTypeId}")
    @put
    op updateEventType(
      @path eventTypeId: Uuid,
      @body body: EventTypeUpdate,
    ): EventType | ErrorBody;

    @route("event-types/{eventTypeId}")
    @delete
    op deleteEventType(
      @path eventTypeId: Uuid,
    ): {
      @statusCode statusCode: 204;
    } | ErrorBody;

    // ── Bookings ───────────────────────────────────────────────────────────

    /** List all upcoming bookings (all event types) */
    @route("bookings")
    @get
    op listBookings(): BookingsList | ErrorBody;

    // ── Working Hours ──────────────────────────────────────────────────────

    @route("settings/working-hours")
    @get
    op getWorkingHours(): WorkingHoursConfig | ErrorBody;

    @route("settings/working-hours")
    @put
    op updateWorkingHours(@body body: WorkingHoursConfig): WorkingHoursConfig | ErrorBody;

    // ── Owner Profile ──────────────────────────────────────────────────────

    @route("profile")
    @get
    op getProfile(): OwnerProfile | ErrorBody;
  }
}
