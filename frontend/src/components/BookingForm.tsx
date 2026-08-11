import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDateTime } from '@/lib/datetime'
import type { EventType, Slot } from '@/lib/types'

export interface BookingFormValues {
  guestName: string
  guestEmail?: string
  guestPhone?: string
  guestTimezone: string
}

interface BookingFormProps {
  eventType: EventType
  slot: Slot
  timezone: string
  isPending: boolean
  onSubmit: (values: BookingFormValues) => void
}

export default function BookingForm({
  eventType,
  slot,
  timezone,
  isPending,
  onSubmit,
}: BookingFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [touched, setTouched] = useState(false)

  const nameError = touched && name.trim() === '' ? 'Укажите имя' : null

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (name.trim() === '') return
    onSubmit({
      guestName: name.trim(),
      guestEmail: email.trim() || undefined,
      guestPhone: phone.trim() || undefined,
      guestTimezone: timezone,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-border bg-card px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {eventType.title} · {eventType.durationInMinutes} мин
        </p>
        <p className="mt-0.5 font-mono text-lg tabular-nums">
          {formatDateTime(slot.startTime, timezone)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="guest-name">
            Имя <span className="text-destructive">*</span>
          </Label>
          <Input
            id="guest-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="Как к вам обращаться"
            aria-invalid={!!nameError}
            required
          />
          {nameError && <p className="text-xs text-destructive">{nameError}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="guest-tz">Часовой пояс</Label>
          <p id="guest-tz" className="rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm">
            {timezone}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="guest-email">Email</Label>
          <Input
            id="guest-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="необязательно"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="guest-phone">Телефон</Label>
          <Input
            id="guest-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="необязательно"
          />
        </div>
      </div>

      <Button type="submit" data-testid="booking-submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending
          ? 'Записываем…'
          : `Записаться на ${formatDateTime(slot.startTime, timezone).split(', ')[1]}`}
      </Button>
    </form>
  )
}
