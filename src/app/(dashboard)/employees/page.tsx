'use client'

import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, Calendar, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AddEmployeeDialog } from '@/components/employees/AddEmployeeDialog'
import { EditEmployeeDialog } from '@/components/employees/EditEmployeeDialog'
import { useEffect, useState } from 'react'

interface Employee {
  id: string
  full_name: string
  email: string
  is_manager: boolean
  weekly_hours_limit: number | null
  organization_id: string
}

interface ScheduleStats {
  employee_id: string
  count: number
}

interface TimeOffStats {
  employee_id: string
  count: number
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [profile, setProfile] = useState<Employee | null>(null)
  const [employeeStats, setEmployeeStats] = useState<Record<string, { upcomingShifts: number; pendingTimeOff: number }>>({})
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      // Get current user and their profile
      const { data: { user } } = await supabase.auth.getUser()
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single()

      if (!userProfile?.is_manager) {
        router.push('/dashboard')
        return
      }

      setProfile(userProfile as Employee)

      // Get all employees in the organization
      const { data: employeeData } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', userProfile.organization_id)
        .order('full_name')

      setEmployees(employeeData as Employee[] || [])

      // Get employee statistics
      const { data: scheduleStats } = await supabase
        .rpc('get_upcoming_shifts_count', {
          current_date: new Date().toISOString().split('T')[0]
        })

      const { data: timeOffStats } = await supabase
        .rpc('get_pending_time_off_count')

      // Create employee stats map
      const stats = (employeeData || []).reduce((acc, employee) => {
        acc[employee.id] = {
          upcomingShifts: scheduleStats?.find((s: ScheduleStats) => s.employee_id === employee.id)?.count || 0,
          pendingTimeOff: timeOffStats?.find((s: TimeOffStats) => s.employee_id === employee.id)?.count || 0,
        }
        return acc
      }, {} as Record<string, { upcomingShifts: number; pendingTimeOff: number }>)

      setEmployeeStats(stats)
    }

    fetchData()
  }, [supabase, router])

  const handleEmployeeUpdated = () => {
    router.refresh()
  }

  if (!profile) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground">
            Manage your team members and their roles
          </p>
        </div>
        <AddEmployeeDialog
          organizationId={profile.organization_id}
          onEmployeeAdded={handleEmployeeUpdated}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {employees.map((employee) => (
          <Card key={employee.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{employee.full_name}</span>
                {employee.is_manager && (
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                    Manager
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Mail className="mr-2 h-4 w-4" />
                  {employee.email}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-2 h-4 w-4" />
                  {employeeStats[employee.id]?.upcomingShifts || 0} upcoming shifts
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-2 h-4 w-4" />
                  {employee.weekly_hours_limit || 'No'} hours/week limit
                </div>
                {employeeStats[employee.id]?.pendingTimeOff > 0 && (
                  <div className="rounded-md bg-yellow-50 p-2 text-sm text-yellow-800">
                    {employeeStats[employee.id].pendingTimeOff} pending time off {employeeStats[employee.id].pendingTimeOff === 1 ? 'request' : 'requests'}
                  </div>
                )}
                <div className="flex space-x-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/dashboard/schedule?employee=${employee.id}`)}
                  >
                    View Schedule
                  </Button>
                  <EditEmployeeDialog
                    employee={employee}
                    onEmployeeUpdated={handleEmployeeUpdated}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 