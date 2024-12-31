'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { User } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { AvailabilityPattern, ScheduleAssignment, ShiftSwapRequest } from '@/types/supabase'
import { Database } from '@/types/supabase-types'

interface DashboardContentProps {
  user: User
  isManager: boolean
}

export function DashboardContent({
  user,
  isManager,
}: DashboardContentProps) {
  const supabase = createClient()

  const { data: availability = [] } = useQuery({
    queryKey: ['availability', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('availability_patterns')
        .select('*')
        .eq('employee_id', user.id)
        .order('day_of_week', { ascending: true })

      if (error) throw error
      return (data || []) as AvailabilityPattern[]
    }
  })

  const { data: upcomingShifts = [] } = useQuery({
    queryKey: ['upcoming-shifts', user.id],
    queryFn: async () => {
      const today = new Date()
      const endDate = new Date(today)
      endDate.setDate(today.getDate() + 7)

      const { data, error } = await supabase
        .from('schedule_assignments')
        .select(`
          *,
          shift:shifts (*)
        `)
        .eq('employee_id', user.id)
        .gte('date', format(today, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date', { ascending: true })

      if (error) throw error
      return (data || []) as ScheduleAssignment[]
    }
  })

  const { data: swapRequests = [] } = useQuery({
    queryKey: ['swap-requests', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_swap_requests')
        .select(`
          *,
          requesting_employee:profiles (*),
          target_employee:profiles (*),
          schedule_assignment:schedule_assignments (
            *,
            shift:shifts (*)
          )
        `)
        .or(`requesting_employee_id.eq.${user.id},target_employee_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as ShiftSwapRequest[]
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Employee Dashboard</h1>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>My Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4 mb-4">
              <Button variant="outline">Previous Week</Button>
              <Button variant="outline">Next Week</Button>
            </div>

            <div className="space-y-6">
              {[0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
                const date = new Date()
                date.setDate(date.getDate() + dayOffset)
                const dayShifts = upcomingShifts.filter(
                  (shift) => shift.date === format(date, 'yyyy-MM-dd')
                )

                return (
                  <div key={dayOffset} className="space-y-2">
                    <h3 className="font-semibold">
                      {format(date, 'EEEE, MMMM d')}
                    </h3>
                    {dayShifts.length > 0 ? (
                      <div className="space-y-2">
                        {dayShifts.map((shift) => (
                          <div
                            key={shift.id}
                            className="flex items-center justify-between rounded-lg border p-4"
                          >
                            <div>
                              <p className="font-medium">{shift.shift.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(`2000-01-01T${shift.shift.start_time}`), 'h:mm a')} -
                                {format(new Date(`2000-01-01T${shift.shift.end_time}`), 'h:mm a')}
                              </p>
                            </div>
                            <Badge>Scheduled</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No shifts scheduled
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex space-x-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="day">Day of Week</Label>
                  <Select>
                    <SelectTrigger id="day">
                      <SelectValue placeholder="Select a day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                      <SelectItem value="0">Sunday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    defaultValue="09:00"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    defaultValue="17:00"
                  />
                </div>
              </div>
              <Button>Add Availability</Button>
            </div>

            <div className="mt-6 space-y-4">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => {
                const dayAvailability = availability.find(a => a.day_of_week === index)
                return (
                  <div key={day} className="space-y-2">
                    <h3 className="font-semibold">{day}</h3>
                    {dayAvailability ? (
                      <p className="text-sm">
                        {format(new Date(`2000-01-01T${dayAvailability.start_time}`), 'h:mm a')} -
                        {format(new Date(`2000-01-01T${dayAvailability.end_time}`), 'h:mm a')}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">No availability set</p>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shift Swap Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {swapRequests.length > 0 ? (
              <div className="space-y-4">
                {swapRequests
                  .filter(req => req.status === 'pending')
                  .map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <p className="font-medium">
                          {format(new Date(request.schedule_assignment.date), 'MMM d')} -
                          {request.schedule_assignment.shift.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {request.requesting_employee.id === user.id
                            ? `Requested to swap with ${request.target_employee.full_name}`
                            : `${request.requesting_employee.full_name} wants to swap with you`}
                        </p>
                      </div>
                      <Badge variant={request.status === 'pending' ? 'outline' : 'secondary'}>
                        {request.status}
                      </Badge>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No pending swap requests</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Swap Request History</CardTitle>
          </CardHeader>
          <CardContent>
            {swapRequests.length > 0 ? (
              <div className="space-y-4">
                {swapRequests
                  .filter(req => req.status !== 'pending')
                  .map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <p className="font-medium">
                          {format(new Date(request.schedule_assignment.date), 'MMM d')} -
                          {request.schedule_assignment.shift.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {request.requesting_employee.id === user.id
                            ? `Requested to swap with ${request.target_employee.full_name}`
                            : `${request.requesting_employee.full_name} wanted to swap with you`}
                        </p>
                      </div>
                      <Badge variant={request.status === 'approved' ? 'default' : 'destructive'}>
                        {request.status}
                      </Badge>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No swap request history</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 