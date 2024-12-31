'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { User } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'

interface DashboardContentProps {
  user: User
  isManager: boolean
}

export function DashboardContent({
  user,
  isManager,
}: DashboardContentProps) {
  const router = useRouter()
  const supabase = createClient()
  const [mounted, setMounted] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render anything until mounted
  if (!mounted) {
    return null
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Employee Dashboard</h1>
        <Badge variant={isManager ? "default" : "secondary"}>
          {isManager ? "Manager" : "Employee"}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>User ID:</strong> {user.id}</p>
              <p>
                <strong>Last Sign In:</strong> {user.last_sign_in_at ? format(new Date(user.last_sign_in_at), 'PPpp') : 'Never'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={() => router.push('/schedule')}>View Schedule</Button>
            <Button className="w-full" variant="outline" onClick={() => router.push('/timeoff')}>Request Time Off</Button>
            {isManager && (
              <Button className="w-full" variant="secondary" onClick={() => router.push('/employees')}>Manage Team</Button>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Shifts Card */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No upcoming shifts scheduled</p>
          </CardContent>
        </Card>
      </div>

      {isManager && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Manager Tools</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Team Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">View and manage your team's schedules</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Schedule Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Create and modify team schedules</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
} 