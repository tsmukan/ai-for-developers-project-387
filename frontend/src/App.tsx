import { BrowserRouter, Route, Routes } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import AppShell from '@/components/AppShell'
import ErrorBoundary from '@/components/ErrorBoundary'
import GuestPage from '@/pages/GuestPage'
import OwnerPage from '@/pages/OwnerPage'

function NotFound() {
  return (
    <div className="space-y-2">
      <p className="font-mono text-xs text-muted-foreground">404</p>
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Страница не найдена
      </h1>
      <p className="text-sm text-muted-foreground">
        Такой страницы нет — проверьте адрес.
      </p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<GuestPage />} />
            <Route path="owner" element={<OwnerPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        <Toaster position="bottom-right" />
      </ErrorBoundary>
    </BrowserRouter>
  )
}