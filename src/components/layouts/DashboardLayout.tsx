'use client'

import { MainNav } from '@/components/navigation/MainNav'
import { UserNav } from '@/components/navigation/UserNav'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      return data
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <MainNav isManager={profile?.role === 'manager'} />
          <div className="ml-auto flex items-center space-x-4">
            <UserNav />
          </div>
        </div>
      </div>
      <main className="flex-1">{children}</main>
    </div>
  )
} 