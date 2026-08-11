import type {
  Booking,
  BookingCreate,
  BookingsList,
  EventType,
  EventTypeCreate,
  EventTypesList,
  EventTypeUpdate,
  OwnerProfile,
  SlotsList,
  SlotsQuery,
  Uuid,
  WorkingHoursConfig,
} from './types'

// Base URL of the separately running backend (or Prism mock).
// Override via VITE_API_BASE_URL; defaults to `prism mock spec/openapi.yaml`.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  details?: string

  constructor(status: number, message: string, details?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch {
    throw new ApiError(0, `API недоступен по адресу ${BASE_URL}. Запустите бэкенд или Prism-мок.`)
  }

  if (!response.ok) {
    let message = `Ошибка ${response.status}`
    let details: string | undefined
    try {
      const body = (await response.json()) as { message?: string; details?: string }
      if (body.message) message = body.message
      if (body.details) details = body.details
    } catch {
      // non-JSON error body; keep the generic message
    }
    throw new ApiError(response.status, message, details)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

// ── Public (Guest) API ─────────────────────────────────────────────────────

export const guestApi = {
  listEventTypes: () => request<EventTypesList>('/event-types'),

  listSlots: (eventTypeId: Uuid, query: SlotsQuery) => {
    const params = new URLSearchParams({ timezone: query.timezone })
    if (query.dateFrom) params.set('dateFrom', query.dateFrom)
    if (query.dateTo) params.set('dateTo', query.dateTo)
    return request<SlotsList>(`/event-types/${eventTypeId}/slots?${params}`)
  },

  createBooking: (eventTypeId: Uuid, body: BookingCreate) =>
    request<Booking>(`/event-types/${eventTypeId}/bookings`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}

// ── Owner API ──────────────────────────────────────────────────────────────

export const ownerApi = {
  listEventTypes: () => request<EventTypesList>('/owner/event-types'),

  getEventType: (eventTypeId: Uuid) => request<EventType>(`/owner/event-types/${eventTypeId}`),

  createEventType: (body: EventTypeCreate) =>
    request<EventType>('/owner/event-types', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateEventType: (eventTypeId: Uuid, body: EventTypeUpdate) =>
    request<EventType>(`/owner/event-types/${eventTypeId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteEventType: (eventTypeId: Uuid) =>
    request<void>(`/owner/event-types/${eventTypeId}`, { method: 'DELETE' }),

  listBookings: () => request<BookingsList>('/owner/bookings'),

  getWorkingHours: () => request<WorkingHoursConfig>('/owner/settings/working-hours'),

  updateWorkingHours: (body: WorkingHoursConfig) =>
    request<WorkingHoursConfig>('/owner/settings/working-hours', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  getProfile: () => request<OwnerProfile>('/owner/profile'),
}
