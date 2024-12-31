import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimeOffRequest {
  id: string
  start_date: string
  end_date: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
}

const daysOfWeek = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export default async function AvailabilityPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  // Get current user and their profile
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single()

  // Get user's availability
  const { data: availability } = await supabase
    .from('employee_availability')
    .select('*')
    .eq('employee_id', user?.id)
    .order('day_of_week')

  // Get user's time off requests
  const { data: timeOffRequests = [] } = await supabase
    .from('time_off_requests')
    .select('*')
    .eq('employee_id', user?.id)
    .gte('end_date', new Date().toISOString())
    .order('start_date') as { data: TimeOffRequest[] }

  // Group availability by day
  const availabilityByDay = daysOfWeek.reduce((acc, _, index) => {
    acc[index] = availability?.filter(a => a.day_of_week === index) || []
    return acc
  }, {} as Record<number, any[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Availability</h1>
        <div className="space-x-2">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Time Off Request
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Availability
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {daysOfWeek.map((day, index) => (
                <div key={day} className="space-y-2">
                  <h3 className="font-medium">{day}</h3>
                  {availabilityByDay[index]?.length > 0 ? (
                    availabilityByDay[index].map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between rounded-md bg-muted p-2 text-sm"
                      >
                        <span>
                          {format(new Date(`2000-01-01T${slot.start_time}`), 'h:mm a')} -
                          {format(new Date(`2000-01-01T${slot.end_time}`), 'h:mm a')}
                        </span>
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Not available
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Time Off Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timeOffRequests.length > 0 ? (
                timeOffRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between rounded-md border p-4"
                  >
                    <div>
                      <p className="font-medium">
                        {format(new Date(request.start_date), 'MMM d')} -
                        {format(new Date(request.end_date), 'MMM d, yyyy')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {request.reason}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'rounded-full px-2 py-1 text-xs font-medium',
                        {
                          'bg-yellow-100 text-yellow-800': request.status === 'pending',
                          'bg-green-100 text-green-800': request.status === 'approved',
                          'bg-red-100 text-red-800': request.status === 'rejected',
                        }
                      )}
                    >
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No time off requests
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 