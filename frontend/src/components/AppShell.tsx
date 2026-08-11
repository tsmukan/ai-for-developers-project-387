import { NavLink, Outlet } from 'react-router'
import { cn } from '@/lib/utils'
import { dayjs } from '@/lib/datetime'

export default function AppShell() {
  return (
    <div className="min-h-svh">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-4 py-5 sm:px-6">
          <NavLink to="/" className="group flex items-baseline gap-3">
            <span className="font-display text-2xl font-semibold tracking-tight">
              Расписание
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {dayjs().format('dd, D MMM YYYY')}
            </span>
          </NavLink>
          <nav className="flex items-center gap-1 text-sm">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-1.5 transition-colors',
                  isActive
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              Записаться
            </NavLink>
            <NavLink
              to="/owner"
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-1.5 transition-colors',
                  isActive
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              Владельцу
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
