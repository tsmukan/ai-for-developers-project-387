import { bookingWindowDates, dayjs } from '@/lib/datetime'
import { cn } from '@/lib/utils'

interface DateStripProps {
  timezone: string
  selectedDate: string
  /** free-slot counts keyed by YYYY-MM-DD */
  countsByDate: Record<string, number>
  onSelect: (date: string) => void
}

/** Horizontal strip of the booking window: today .. today+14 days. */
export default function DateStrip({
  timezone,
  selectedDate,
  countsByDate,
  onSelect,
}: DateStripProps) {
  const dates = bookingWindowDates(timezone)

  return (
    <div
      role="tablist"
      aria-label="Дата встречи"
      className="flex gap-px overflow-x-auto rounded-lg border border-border bg-border"
    >
      {dates.map((date) => {
        const d = dayjs(date)
        const count = countsByDate[date] ?? 0
        const selected = date === selectedDate
        return (
          <button
            key={date}
            type="button"
            role="tab"
            data-testid="date-tab"
            data-free={count > 0 ? 'true' : 'false'}
            aria-selected={selected}
            onClick={() => onSelect(date)}
            className={cn(
              'flex min-w-16 flex-col items-center gap-0.5 bg-card px-3 py-2 transition-colors',
              selected
                ? 'bg-foreground text-background'
                : 'text-foreground hover:bg-secondary',
            )}
          >
            <span className="font-mono text-[11px] tracking-wide opacity-70">
              {d.format('dd')}
            </span>
            <span className="font-mono text-base leading-none tabular-nums">
              {d.format('D')}
            </span>
            <span
              className={cn(
                'mt-0.5 size-1.5 rounded-full',
                count > 0 ? 'bg-accent' : 'bg-transparent',
              )}
              aria-hidden
            />
          </button>
        )
      })}
    </div>
  )
}
