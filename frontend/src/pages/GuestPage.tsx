import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { guestApi, ApiError } from '@/lib/api'
import type { Booking, EventType, Slot } from '@/lib/types'
import {
  bookingWindowDates,
  formatDateTime,
  guessTimezone,
  toTz,
  todayInTz,
} from '@/lib/datetime'
import { COMMON_TIMEZONES } from '@/lib/timezones'
import DateStrip from '@/components/DateStrip'
import SlotBoard from '@/components/SlotBoard'
import BookingForm, { type BookingFormValues } from '@/components/BookingForm'
import QueryError from '@/components/QueryError'
import StepHeading from '@/components/StepHeading'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export default function GuestPage() {
  const queryClient = useQueryClient()
  const [timezone, setTimezone] = useState(guessTimezone)
  const [eventType, setEventType] = useState<EventType | null>(null)
  const [selectedDate, setSelectedDate] = useState(() => todayInTz(timezone))
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [confirmed, setConfirmed] = useState<Booking | null>(null)

  const eventTypesQuery = useQuery({
    queryKey: ['event-types'],
    queryFn: () => guestApi.listEventTypes(),
  })

  const slotsQuery = useQuery({
    queryKey: ['slots', eventType?.id, timezone],
    queryFn: () => guestApi.listSlots(eventType!.id, { timezone }),
    enabled: eventType !== null,
  })

  const bookingMutation = useMutation({
    mutationFn: (values: BookingFormValues) =>
      guestApi.createBooking(eventType!.id, {
        startTime: selectedSlot!.startTime,
        ...values,
      }),
    onSuccess: (booking) => {
      setConfirmed(booking)
      setSelectedSlot(null)
      queryClient.invalidateQueries({ queryKey: ['slots'] })
      queryClient.invalidateQueries({ queryKey: ['owner', 'bookings'] })
      toast.success('Запись создана')
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        toast.error('Это время уже занято', { description: 'Выберите другой слот.' })
        queryClient.invalidateQueries({ queryKey: ['slots'] })
        setSelectedSlot(null)
      } else {
        toast.error('Не удалось создать запись', {
          description: error.message,
        })
      }
    },
  })

  const slotsByDate = useMemo(() => {
    const grouped: Record<string, Slot[]> = {}
    for (const slot of slotsQuery.data?.items ?? []) {
      const date = toTz(slot.startTime, timezone).format('YYYY-MM-DD')
      ;(grouped[date] ??= []).push(slot)
    }
    return grouped
  }, [slotsQuery.data, timezone])

  const countsByDate = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const date of bookingWindowDates(timezone)) {
      counts[date] = slotsByDate[date]?.length ?? 0
    }
    return counts
  }, [slotsByDate, timezone])

  const eventTypes = eventTypesQuery.data?.items ?? []

  function pickEventType(next: EventType) {
    setEventType(next)
    setSelectedSlot(null)
    setConfirmed(null)
  }

  function pickSlot(slot: Slot) {
    setSelectedSlot(slot)
    setConfirmed(null)
  }

  if (eventTypesQuery.isError) {
    return (
      <QueryError
        message={eventTypesQuery.error.message}
        onRetry={() => eventTypesQuery.refetch()}
      />
    )
  }

  return (
    <div className="space-y-10">
      <section aria-labelledby="step-type">
        <StepHeading index="01" title="Что за встреча" />
        {eventTypesQuery.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : eventTypes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
            Пока нет ни одного типа событий. Владелец может добавить их в разделе
            «Владельцу».
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {eventTypes.map((type) => {
              const active = eventType?.id === type.id
              return (
                <button
                  key={type.id}
                  type="button"
                  data-testid="event-type-card"
                  onClick={() => pickEventType(type)}
                  aria-pressed={active}
                  className={cn(
                    'rounded-lg border px-4 py-3 text-left transition-colors',
                    active
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-foreground/40',
                  )}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{type.title}</span>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {type.durationInMinutes} мин
                    </span>
                  </span>
                  <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
                    {type.description}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {eventType && (
        <section aria-labelledby="step-time" className="animate-in fade-in">
          <StepHeading index="02" title="Когда">
            <Select
              value={timezone}
              onValueChange={(tz) => {
                setTimezone(tz)
                setSelectedSlot(null)
                setSelectedDate(todayInTz(tz))
              }}
            >
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...new Set([timezone, ...COMMON_TIMEZONES])].map((zone) => (
                  <SelectItem key={zone} value={zone}>
                    {zone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </StepHeading>

          <div className="space-y-4">
            <DateStrip
              timezone={timezone}
              selectedDate={selectedDate}
              countsByDate={countsByDate}
              onSelect={(date) => {
                setSelectedDate(date)
                setSelectedSlot(null)
              }}
            />
            <SlotBoard
              date={selectedDate}
              slots={slotsByDate[selectedDate] ?? []}
              timezone={timezone}
              selectedStart={selectedSlot?.startTime ?? null}
              isLoading={slotsQuery.isPending}
              onSelect={pickSlot}
            />
            {slotsQuery.isError && (
              <QueryError
                message={slotsQuery.error.message}
                onRetry={() => slotsQuery.refetch()}
              />
            )}
          </div>
        </section>
      )}

      {eventType && selectedSlot && (
        <section aria-labelledby="step-details" className="animate-in fade-in">
          <StepHeading index="03" title="Ваши данные" />
          <BookingForm
            eventType={eventType}
            slot={selectedSlot}
            timezone={timezone}
            isPending={bookingMutation.isPending}
            onSubmit={(values) => bookingMutation.mutate(values)}
          />
        </section>
      )}

      {confirmed && (
        <section
          data-testid="booking-confirmed"
          aria-live="polite"
          className="animate-in fade-in rounded-lg border border-accent/40 bg-accent/10 px-4 py-5"
        >
          <p className="font-display text-xl">Вы записаны</p>
          <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Время</dt>
              <dd className="font-mono tabular-nums">
                {formatDateTime(confirmed.startTime, confirmed.guestTimezone)} —{' '}
                {toTz(confirmed.endTime, confirmed.guestTimezone).format('HH:mm')}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Часовой пояс</dt>
              <dd className="font-mono">{confirmed.guestTimezone}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Имя</dt>
              <dd>{confirmed.guestName}</dd>
            </div>
          </dl>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setConfirmed(null)}
          >
            Записать ещё
          </Button>
        </section>
      )}
    </div>
  )
}
