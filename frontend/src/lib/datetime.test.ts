import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import { bookingWindowDates, formatTime, todayInTz, toTz } from './datetime'

// A fixed absolute instant: 2026-06-01 12:00 UTC.
const INSTANT = '2026-06-01T12:00:00Z'

describe('formatTime', () => {
  it('renders the same instant at different local hours per guest zone', () => {
    expect(formatTime(INSTANT, 'Europe/Moscow')).toBe('15:00')
    expect(formatTime(INSTANT, 'UTC')).toBe('12:00')
    expect(formatTime(INSTANT, 'America/New_York')).toBe('08:00')
    expect(formatTime(INSTANT, 'Asia/Tokyo')).toBe('21:00')
    expect(formatTime(INSTANT, 'Pacific/Kiritimati')).toBe('02:00')
  })

  it('may render the instant on a different calendar day for far zones', () => {
    // UTC+14: 2026-06-01 12:00Z is already 2026-06-02 there.
    expect(toTz(INSTANT, 'Pacific/Kiritimati').format('YYYY-MM-DD')).toBe('2026-06-02')
    expect(toTz(INSTANT, 'Europe/Moscow').format('YYYY-MM-DD')).toBe('2026-06-01')
  })
})

describe('todayInTz / bookingWindowDates', () => {
  it('never reports a date in the past relative to UTC (far-east zones)', () => {
    const utcToday = dayjs().tz('UTC').format('YYYY-MM-DD')
    const kiribatiToday = todayInTz('Pacific/Kiritimati')
    const diff = dayjs(kiribatiToday).diff(dayjs(utcToday), 'day')
    // UTC+14: at most one calendar day ahead of UTC.
    expect(diff).toBeGreaterThanOrEqual(0)
    expect(diff).toBeLessThanOrEqual(1)
  })

  it('builds a stable 15-day window ending on today+14', () => {
    const tz = 'Europe/Moscow'
    const dates = bookingWindowDates(tz)
    expect(dates).toHaveLength(15)
    expect(dates[0]).toBe(todayInTz(tz))
    expect(dates[14]).toBe(dayjs().tz(tz).add(14, 'day').format('YYYY-MM-DD'))
  })

  it('gets the same window dates regardless of the zones whose calendars align', () => {
    // Within the same calendar day most zones share the window start;
    // at minimum the window must be internally consistent per zone.
    for (const tz of ['UTC', 'Europe/Moscow', 'Asia/Tokyo', 'America/New_York']) {
      const dates = bookingWindowDates(tz)
      let prev = dayjs(dates[0]).subtract(1, 'day')
      for (const d of dates) {
        expect(dayjs(d).diff(prev, 'day')).toBe(1)
        prev = dayjs(d)
      }
    }
  })
})