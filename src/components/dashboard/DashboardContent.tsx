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
import { useSignOut } from '@/hooks/useSignOut'

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
  const { signOut } = useSignOut()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render anything until mounted
  if (!mounted) {
    return null
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 bg-red-600 p-4 text-center z-50 shadow-lg">
        <button 
          onClick={signOut}
          className="text-white font-bold text-xl hover:underline transition-colors"
        >
          🚪 Sign Out
        </button>
      </div>
      
      <div className="flex-1 container mx-auto space-y-6 mt-20 p-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Employee Dashboard</h1>
          <Badge variant={isManager ? "default" : "secondary"}>
            {isManager ? "Manager" : "Employee"}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* User Info Card */}
          <Card className="border border-border bg-card">
            <CardHeader>
              <CardTitle className="text-card-foreground">Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-card-foreground">
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>User ID:</strong> {user.id}</p>
                <p>
                  <strong>Last Sign In:</strong> {user.last_sign_in_at ? format(new Date(user.last_sign_in_at), 'PPpp') : 'Never'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card className="border border-border bg-card">
            <CardHeader>
              <CardTitle className="text-card-foreground">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">View Schedule</Button>
              <Button className="w-full" variant="outline">Request Time Off</Button>
              {isManager && (
                <Button className="w-full" variant="secondary">Manage Team</Button>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Shifts Card */}
          <Card className="border border-border bg-card">
            <CardHeader>
              <CardTitle className="text-card-foreground">Upcoming Shifts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No upcoming shifts scheduled</p>
            </CardContent>
          </Card>
        </div>

        {isManager && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4 text-white">Manager Tools</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-card-foreground">Team Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">View and manage your team's schedules</p>
                </CardContent>
              </Card>
              
              <Card className="border border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-card-foreground">Schedule Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Create and modify team schedules</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 