import { useQuery } from '@tanstack/react-query'
import { ownerApi } from '@/lib/api'
import { formatDateTime, toTz } from '@/lib/datetime'
import QueryError from '@/components/QueryError'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function BookingsTable() {
  const query = useQuery({
    queryKey: ['owner', 'bookings-table'],
    queryFn: async () => {
      const [bookings, eventTypes, profile] = await Promise.all([
        ownerApi.listBookings(),
        ownerApi.listEventTypes(),
        ownerApi.getProfile(),
      ])
      return { items: bookings.items, eventTypes: eventTypes.items, profile }
    },
  })

  if (query.isError) {
    return (
      <QueryError message={query.error.message} onRetry={() => query.refetch()} />
    )
  }

  if (query.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    )
  }

  const { items: data, eventTypes, profile } = query.data!
  const items = [...data].sort((a, b) => a.startTime.localeCompare(b.startTime))

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Броней пока нет. Они появятся здесь, как только гость запишется.
      </p>
    )
  }

  const tz = profile.timezone
  const titleById = new Map(eventTypes.map((t) => [t.id, t.title]))

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Время ({tz})</TableHead>
            <TableHead>Событие</TableHead>
            <TableHead>Гость</TableHead>
            <TableHead>Контакты</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((booking) => (
            <TableRow key={booking.id} data-testid="booking-row">
              <TableCell className="font-mono text-sm whitespace-nowrap tabular-nums">
                {formatDateTime(booking.startTime, tz)} —{' '}
                {toTz(booking.endTime, tz).format('HH:mm')}
              </TableCell>
              <TableCell>{titleById.get(booking.eventTypeId) ?? '—'}</TableCell>
              <TableCell>
                <div>{booking.guestName}</div>
                {booking.guestTimezone !== tz && (
                  <div className="font-mono text-xs text-muted-foreground">
                    {booking.guestTimezone}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {booking.guestEmail && <div>{booking.guestEmail}</div>}
                {booking.guestPhone && <div>{booking.guestPhone}</div>}
                {!booking.guestEmail && !booking.guestPhone && '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
