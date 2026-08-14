import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ownerApi } from '@/lib/api'
import type { DayOfWeek, WorkingHoursEntry } from '@/lib/types'
import { DAY_OF_WEEK_LABELS, DAY_OF_WEEK_ORDER } from '@/lib/timezones'
import QueryError from '@/components/QueryError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'

const DEFAULT_ENTRY = (dayOfWeek: DayOfWeek): WorkingHoursEntry => ({
  dayOfWeek,
  startTime: '09:00',
  endTime: '18:00',
  isAvailable: false,
})

export default function WorkingHoursForm() {
  const queryClient = useQueryClient()
  const [entries, setEntries] = useState<WorkingHoursEntry[] | null>(null)

  const query = useQuery({
    queryKey: ['owner', 'working-hours'],
    queryFn: () => ownerApi.getWorkingHours(),
  })

  useEffect(() => {
    if (query.data && entries === null) {
      const byDay = new Map(query.data.entries.map((e) => [e.dayOfWeek, e]))
      setEntries(
        DAY_OF_WEEK_ORDER.map(
          (day) => byDay.get(day as DayOfWeek) ?? DEFAULT_ENTRY(day as DayOfWeek),
        ),
      )
    }
  }, [query.data, entries])

  const mutation = useMutation({
    mutationFn: (next: WorkingHoursEntry[]) => ownerApi.updateWorkingHours({ entries: next }),
    onSuccess: (data) => {
      queryClient.setQueryData(['owner', 'working-hours'], data)
      queryClient.invalidateQueries({ queryKey: ['slots'] })
      toast.success('Рабочие часы сохранены')
    },
    onError: (error) =>
      toast.error('Не удалось сохранить', { description: error.message }),
  })

  if (query.isError) {
    return <QueryError message={query.error.message} onRetry={() => query.refetch()} />
  }

  if (entries === null) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    )
  }

  function patch(dayOfWeek: number, patchValue: Partial<WorkingHoursEntry>) {
    setEntries((current) =>
      (current ?? []).map((entry) =>
        entry.dayOfWeek === dayOfWeek ? { ...entry, ...patchValue } : entry,
      ),
    )
  }

  function handleSave() {
    const invalid = (entries ?? []).find(
      (e) =>
        e.isAvailable &&
        (e.startTime.trim() === '' || e.endTime.trim() === '' || e.startTime >= e.endTime),
    )
    if (invalid) {
      const label = DAY_OF_WEEK_LABELS[invalid.dayOfWeek]
      toast.error('Проверьте время', {
        description: invalid.startTime.trim() === '' || invalid.endTime.trim() === ''
          ? `Укажите начало и конец для «${label}».`
          : `В «${label}» начало должно быть раньше конца.`,
      })
      return
    }
    mutation.mutate(entries ?? [])
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        В какие дни и часы гости видят свободные слоты.
      </p>
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {entries.map((entry) => (
          <li
            key={entry.dayOfWeek}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
          >
            <Switch
              id={`wh-${entry.dayOfWeek}`}
              checked={entry.isAvailable}
              onCheckedChange={(checked) =>
                patch(entry.dayOfWeek, { isAvailable: checked })
              }
              aria-label={`${DAY_OF_WEEK_LABELS[entry.dayOfWeek]}: рабочий день`}
            />
            <label htmlFor={`wh-${entry.dayOfWeek}`} className="w-32 text-sm font-medium">
              {DAY_OF_WEEK_LABELS[entry.dayOfWeek]}
            </label>
            {entry.isAvailable ? (
              <div className="flex items-center gap-2 font-mono text-sm">
                <Input
                  type="time"
                  value={entry.startTime}
                  onChange={(e) => patch(entry.dayOfWeek, { startTime: e.target.value })}
                  className="w-28 font-mono"
                  aria-label={`${DAY_OF_WEEK_LABELS[entry.dayOfWeek]}: начало`}
                />
                <span className="text-muted-foreground">—</span>
                <Input
                  type="time"
                  value={entry.endTime}
                  onChange={(e) => patch(entry.dayOfWeek, { endTime: e.target.value })}
                  className="w-28 font-mono"
                  aria-label={`${DAY_OF_WEEK_LABELS[entry.dayOfWeek]}: конец`}
                />
              </div>
            ) : (
              <span className="font-mono text-sm text-muted-foreground">выходной</span>
            )}
          </li>
        ))}
      </ul>
      <Button onClick={handleSave} disabled={mutation.isPending}>
        {mutation.isPending ? 'Сохраняем…' : 'Сохранить часы'}
      </Button>
    </div>
  )
}
