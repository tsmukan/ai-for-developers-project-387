import dayjs, { type Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import 'dayjs/locale/ru'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.locale('ru')

export const BOOKING_WINDOW_DAYS = 14

export function guessTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

/** Today (YYYY-MM-DD) in the given IANA timezone. */
export function todayInTz(tz: string): string {
  return dayjs().tz(tz).format('YYYY-MM-DD')
}

/** All dates in the booking window: today .. today+14 days, inclusive. */
export function bookingWindowDates(tz: string): string[] {
  const start = dayjs().tz(tz).startOf('day')
  return Array.from({ length: BOOKING_WINDOW_DAYS + 1 }, (_, i) =>
    start.add(i, 'day').format('YYYY-MM-DD'),
  )
}

export function toTz(iso: string, tz: string): Dayjs {
  return dayjs(iso).tz(tz)
}

/** "HH:mm" in the given timezone — the monospace figures of the timetable. */
export function formatTime(iso: string, tz: string): string {
  return toTz(iso, tz).format('HH:mm')
}

export function formatDateLabel(date: string): string {
  return dayjs(date).format('dd, D MMM')
}

export function formatDateTime(iso: string, tz: string): string {
  return toTz(iso, tz).format('D MMM YYYY, HH:mm')
}

export { dayjs }
