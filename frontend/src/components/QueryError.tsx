import { Button } from '@/components/ui/button'

interface QueryErrorProps {
  message: string
  onRetry?: () => void
}

export default function QueryError({ message, onRetry }: QueryErrorProps) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-5"
    >
      <p className="text-sm font-medium text-destructive">Что-то пошло не так</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          Повторить
        </Button>
      )}
    </div>
  )
}
