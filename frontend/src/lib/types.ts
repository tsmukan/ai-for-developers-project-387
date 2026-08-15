// Types mirroring spec/api.tsp (TypeSpec contract).

export type Timezone = string // IANA, e.g. "Europe/Moscow"
export type TimeString = string // "HH:mm"
export type DateTime = string // ISO 8601 UTC
export type Uuid = string

// ── EventType ──────────────────────────────────────────────────────────────

export interface EventType {
  id: Uuid
  title: string
  description: string
  durationInMinutes: number
}

export interface EventTypeCreate {
  title: string
  description: string
  durationInMinutes: number
}

export interface EventTypeUpdate {
  title?: string
  description?: string
  durationInMinutes?: number
}

// ── WorkingHours ───────────────────────────────────────────────────────────

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface WorkingHoursEntry {
  dayOfWeek: DayOfWeek
  startTime: TimeString
  endTime: TimeString
  isAvailable: boolean
}

export interface WorkingHoursConfig {
  entries: WorkingHoursEntry[]
}

// ── OwnerProfile ───────────────────────────────────────────────────────────

export interface OwnerProfile {
  name: string
  email: string
  timezone: Timezone
}

// ── Booking ────────────────────────────────────────────────────────────────

export interface Booking {
  id: Uuid
  eventTypeId: Uuid
  startTime: DateTime
  endTime: DateTime
  guestName: string
  guestEmail?: string
  guestPhone?: string
  guestTimezone: Timezone
  createdAt: DateTime
}

export interface BookingCreate {
  startTime: DateTime
  guestName: string
  guestEmail?: string
  guestPhone?: string
  guestTimezone: Timezone
}

// ── Slot ───────────────────────────────────────────────────────────────────

export interface Slot {
  startTime: DateTime
  endTime: DateTime
}

// ── Responses ──────────────────────────────────────────────────────────────

export interface BookingsList {
  items: Booking[]
  total: number
}

export interface EventTypesList {
  items: EventType[]
}

export interface SlotsList {
  items: Slot[]
  timezone: Timezone
}

export interface SlotsQuery {
  timezone: Timezone
  dateFrom?: string // "YYYY-MM-DD"
  dateTo?: string // "YYYY-MM-DD"
}
