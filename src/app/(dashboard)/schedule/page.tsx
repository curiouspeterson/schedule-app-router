import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default async function SchedulePage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  // Get current user and their profile
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single()

  // Get current week's dates
  const today = new Date()
  const start = startOfWeek(today, { weekStartsOn: 0 })
  const end = endOfWeek(today, { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start, end })

  // Get schedule for the current week
  const { data: schedules } = await supabase
    .from('schedule_assignments')
    .select(`
      *,
      shifts (
        name,
        start_time,
        end_time
      ),
      profiles (
        full_name
      )
    `)
    .gte('date', format(start, 'yyyy-MM-dd'))
    .lte('date', format(end, 'yyyy-MM-dd'))
    .order('date')
    .order('shifts(start_time)')

  // Group schedules by date
  const schedulesByDate = days.reduce((acc, date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    acc[dateStr] = schedules?.filter(s => s.date === dateStr) || []
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Schedule</h1>
        {profile?.is_manager && (
          <Button>Create Schedule</Button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {format(start, 'MMMM d')} - {format(end, 'MMMM d, yyyy')}
        </h2>
        <Button variant="outline" size="icon">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-4">
        {days.map((date) => (
          <Card key={date.toISOString()}>
            <CardHeader>
              <CardTitle className="text-center">
                <div className="text-sm font-normal text-muted-foreground">
                  {format(date, 'EEEE')}
                </div>
                <div className="mt-1 text-xl">
                  {format(date, 'd')}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {schedulesByDate[format(date, 'yyyy-MM-dd')]?.map((schedule) => (
                <div
                  key={schedule.id}
                  className="rounded-md bg-muted p-2 text-sm"
                >
                  <div className="font-medium">
                    {schedule.shifts.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(`2000-01-01T${schedule.shifts.start_time}`), 'h:mm a')} -
                    {format(new Date(`2000-01-01T${schedule.shifts.end_time}`), 'h:mm a')}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {schedule.profiles.full_name}
                  </div>
                </div>
              ))}
              {schedulesByDate[format(date, 'yyyy-MM-dd')]?.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  No shifts
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 