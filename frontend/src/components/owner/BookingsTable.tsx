import { useQuery } from '@tanstack/react-query'
import { ownerApi } from '@/lib/api'
import { formatDateTime, toTz } from '@/lib/datetime'
import QueryError from '@/components/QueryError'
import { Button } from '@/components/ui/button'
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

  if (bookingsQuery.isError) {
    return (
      <QueryError
        message={bookingsQuery.error.message}
        onRetry={() => bookingsQuery.refetch()}
      />
    )
  }

  if (bookingsQuery.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    )
  }

  const auxiliaryError =
    eventTypesQuery.isError || profileQuery.isError
      ? (eventTypesQuery.error ?? profileQuery.error)
      : null

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
    <div className="space-y-4">
      {auxiliaryError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3"
        >
          <p className="text-sm text-muted-foreground">
            Не удалось загрузить названия событий или часовой пояс:{' '}
            <span className="text-destructive">{auxiliaryError.message}</span>
          </p>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => {
              eventTypesQuery.refetch()
              profileQuery.refetch()
            }}
          >
            Повторить
          </Button>
        </div>
      )}
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
    </div>
  )
}
