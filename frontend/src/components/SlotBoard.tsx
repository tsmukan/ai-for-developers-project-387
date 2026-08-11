import type { Slot } from '@/lib/types'
import { formatDateLabel, formatTime } from '@/lib/datetime'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface SlotBoardProps {
  date: string
  slots: Slot[]
  timezone: string
  selectedStart: string | null
  isLoading: boolean
  onSelect: (slot: Slot) => void
}

/**
 * The timetable board: mono time figures on a hairline grid.
 * Green edge = free slot, copper fill = the chosen one.
 */
export default function SlotBoard({
  date,
  slots,
  timezone,
  selectedStart,
  isLoading,
  onSelect,
}: SlotBoardProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-px rounded-lg border border-border bg-border sm:grid-cols-4 md:grid-cols-6">
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} className="h-11 rounded-none" />
        ))}
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
        <p className="font-mono text-sm text-muted-foreground">— : —</p>
        <p className="mt-2 text-sm text-muted-foreground">
          На {formatDateLabel(date)} свободного времени нет. Выберите другой день.
        </p>
      </div>
    )
  }

  return (
    <div
      role="listbox"
      aria-label={`Свободное время на ${date}`}
      className="grid animate-in fade-in grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4 md:grid-cols-6"
    >
      {slots.map((slot, i) => {
        const selected = slot.startTime === selectedStart
        return (
          <button
            key={slot.startTime}
            type="button"
            role="option"
            data-testid="slot-option"
            aria-selected={selected}
            onClick={() => onSelect(slot)}
            style={{ animationDelay: `${Math.min(i * 25, 300)}ms` }}
            className={cn(
              'h-11 animate-in fade-in bg-card font-mono text-sm tabular-nums transition-colors',
              'hover:bg-accent/15 hover:text-accent',
              selected
                ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                : 'text-foreground',
            )}
          >
            {formatTime(slot.startTime, timezone)}
          </button>
        )
      })}
    </div>
  )
}
