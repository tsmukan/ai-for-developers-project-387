import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import EventTypesAdmin from '@/components/owner/EventTypesAdmin'
import BookingsTable from '@/components/owner/BookingsTable'
import WorkingHoursForm from '@/components/owner/WorkingHoursForm'
import ProfileCard from '@/components/owner/ProfileCard'

export default function OwnerPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="font-mono text-xs text-muted-foreground">владелец</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
          Управление расписанием
        </h1>
      </div>
      <Tabs defaultValue="event-types">
        <TabsList>
          <TabsTrigger value="event-types">Типы событий</TabsTrigger>
          <TabsTrigger value="bookings">Брони</TabsTrigger>
          <TabsTrigger value="working-hours">Рабочие часы</TabsTrigger>
          <TabsTrigger value="profile">Профиль</TabsTrigger>
        </TabsList>
        <TabsContent value="event-types" className="mt-6">
          <EventTypesAdmin />
        </TabsContent>
        <TabsContent value="bookings" className="mt-6">
          <BookingsTable />
        </TabsContent>
        <TabsContent value="working-hours" className="mt-6">
          <WorkingHoursForm />
        </TabsContent>
        <TabsContent value="profile" className="mt-6">
          <ProfileCard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
