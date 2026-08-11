import { BrowserRouter, Route, Routes } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import AppShell from '@/components/AppShell'
import GuestPage from '@/pages/GuestPage'
import OwnerPage from '@/pages/OwnerPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<GuestPage />} />
          <Route path="owner" element={<OwnerPage />} />
        </Route>
      </Routes>
      <Toaster position="bottom-right" />
    </BrowserRouter>
  )
}
