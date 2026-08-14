import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ownerApi } from '@/lib/api'
import type { EventType, EventTypeCreate } from '@/lib/types'
import QueryError from '@/components/QueryError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface EditorState {
  open: boolean
  mode: 'create' | 'edit'
  eventType: EventType | null
}

export default function EventTypesAdmin() {
  const queryClient = useQueryClient()
  const [editor, setEditor] = useState<EditorState>({
    open: false,
    mode: 'create',
    eventType: null,
  })
  const [deleting, setDeleting] = useState<EventType | null>(null)

  const query = useQuery({
    queryKey: ['owner', 'event-types'],
    queryFn: () => ownerApi.listEventTypes(),
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['owner', 'event-types'] }).then(() =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['event-types'] }),
        queryClient.invalidateQueries({ queryKey: ['slots'] }),
      ]),
    )

  const saveMutation = useMutation({
    mutationFn: (values: EventTypeCreate) =>
      editor.mode === 'create'
        ? ownerApi.createEventType(values)
        : ownerApi.updateEventType(editor.eventType!.id, values),
    onSuccess: async () => {
      await invalidate()
      setEditor({ open: false, mode: 'create', eventType: null })
      toast.success(editor.mode === 'create' ? 'Тип события создан' : 'Тип события обновлён')
    },
    onError: (error) =>
      toast.error('Не удалось сохранить', { description: error.message }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ownerApi.deleteEventType(id),
    onSuccess: async () => {
      await invalidate()
      setDeleting(null)
      toast.success('Тип события удалён')
    },
    onError: (error) =>
      toast.error('Не удалось удалить', { description: error.message }),
  })

  if (query.isError) {
    return <QueryError message={query.error.message} onRetry={() => query.refetch()} />
  }

  const items = query.data?.items ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Что гости могут забронировать и сколько это длится.
        </p>
        <Button
          size="sm"
          onClick={() => setEditor({ open: true, mode: 'create', eventType: null })}
        >
          <Plus className="size-4" />
          Добавить тип
        </Button>
      </div>

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Ни одного типа событий. Добавьте первый — без него гостям нечего
          бронировать.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {items.map((type) => (
            <li key={type.id} className="flex items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{type.title}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {type.description}
                </p>
              </div>
              <span className="font-mono text-sm text-muted-foreground tabular-nums">
                {type.durationInMinutes} мин
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Изменить ${type.title}`}
                onClick={() => setEditor({ open: true, mode: 'edit', eventType: type })}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Удалить ${type.title}`}
                onClick={() => setDeleting(type)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {editor.open && (
        <EventTypeEditor
          key={editor.eventType?.id ?? 'new'}
          state={editor}
          isPending={saveMutation.isPending}
          onClose={() => setEditor((s) => ({ ...s, open: false }))}
          onSave={(values) => saveMutation.mutate(values)}
        />
      )}

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить «{deleting?.title}»?</DialogTitle>
            <DialogDescription>
              Гости больше не смогут записываться на этот тип события. Существующие
              брони не отменяются.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Оставить
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
            >
              {deleteMutation.isPending ? 'Удаляем…' : 'Удалить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface EventTypeEditorProps {
  state: EditorState
  isPending: boolean
  onClose: () => void
  onSave: (values: EventTypeCreate) => void
}

function EventTypeEditor({ state, isPending, onClose, onSave }: EventTypeEditorProps) {
  const [title, setTitle] = useState(state.eventType?.title ?? '')
  const [description, setDescription] = useState(state.eventType?.description ?? '')
  const [duration, setDuration] = useState(
    state.eventType ? String(state.eventType.durationInMinutes) : '30',
  )
  const [touched, setTouched] = useState(false)

  const durationNum = Number(duration)
  const titleError = touched && title.trim() === '' ? 'Укажите название' : null
  const durationError =
    touched && (!Number.isInteger(durationNum) || durationNum < 1)
      ? 'Минимум 1 минута'
      : null

  function handleSubmit() {
    setTouched(true)
    if (title.trim() === '' || !Number.isInteger(durationNum) || durationNum < 1) return
    onSave({
      title: title.trim(),
      description: description.trim(),
      durationInMinutes: durationNum,
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {state.mode === 'create' ? 'Новый тип события' : 'Изменить тип события'}
          </DialogTitle>
          <DialogDescription>
            Название и длительность видны гостю на странице записи.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="et-title">
              Название <span className="text-destructive">*</span>
            </Label>
            <Input
              id="et-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Консультация"
              aria-invalid={!!titleError}
            />
            {titleError && <p className="text-xs text-destructive">{titleError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="et-description">Описание</Label>
            <Textarea
              id="et-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Что обсудим и кому подходит"
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="et-duration">
              Длительность, минут <span className="text-destructive">*</span>
            </Label>
            <Input
              id="et-duration"
              type="number"
              min={1}
              step={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={!!durationError}
            />
            {durationError && <p className="text-xs text-destructive">{durationError}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Сохраняем…' : state.mode === 'create' ? 'Создать' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
