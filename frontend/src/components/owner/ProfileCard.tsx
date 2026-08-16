import { useQuery } from '@tanstack/react-query'
import { ownerApi } from '@/lib/api'
import QueryError from '@/components/QueryError'
import { Skeleton } from '@/components/ui/skeleton'

export default function ProfileCard() {
  const query = useQuery({
    queryKey: ['owner', 'profile'],
    queryFn: ({ signal }) => ownerApi.getProfile(signal),
  })

  if (query.isError) {
    return <QueryError message={query.error.message} onRetry={() => query.refetch()} />
  }

  if (query.isLoading) {
    return <Skeleton className="h-32" />
  }

  const profile = query.data!

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-5">
      <p className="font-display text-xl">{profile.name}</p>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex gap-2">
          <dt className="w-28 text-muted-foreground">Email</dt>
          <dd>{profile.email}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-28 text-muted-foreground">Часовой пояс</dt>
          <dd className="font-mono">{profile.timezone}</dd>
        </div>
      </dl>
      <p className="mt-4 text-sm text-muted-foreground">
        Время броней в таблице показано в этом часовом поясе.
      </p>
    </div>
  )
}
