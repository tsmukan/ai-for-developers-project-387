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
  const bookingsQuery = useQuery({
    queryKey: ['owner', 'bookings'],
    queryFn: ({ signal }) => ownerApi.listBookings(signal),
  })
  const eventTypesQuery = useQuery({
    queryKey: ['owner', 'event-types'],
    queryFn: ({ signal }) => ownerApi.listEventTypes(signal),
  })
  const profileQuery = useQuery({
    queryKey: ['owner', 'profile'],
    queryFn: ({ signal }) => ownerApi.getProfile(signal),
  })

  const failed = bookingsQuery.isError
    ? bookingsQuery
    : eventTypesQuery.isError
      ? eventTypesQuery
      : profileQuery.isError
        ? profileQuery
        : null

  if (failed) {
    return (
      <QueryError
        message={failed.error.message}
        onRetry={() => failed.refetch()}
      />
    )
  }

  if (
    bookingsQuery.isLoading ||
    eventTypesQuery.isLoading ||
    profileQuery.isLoading
  ) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    )
  }

  const items = [...(bookingsQuery.data?.items ?? [])].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  )

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Броней пока нет. Они появятся здесь, как только гость запишется.
      </p>
    )
  }

  const tz = profileQuery.data?.timezone ?? 'UTC'
  const titleById = new Map(
    (eventTypesQuery.data?.items ?? []).map((t) => [t.id, t.title]),
  )

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
