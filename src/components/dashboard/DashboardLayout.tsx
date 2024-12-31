'use client'

import { MainNav } from '@/components/navigation/MainNav'
import { UserNav } from '@/components/navigation/UserNav'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { User } from '@supabase/supabase-js'

interface DashboardLayoutProps {
  user: User
  children: React.ReactNode
}

export function DashboardLayout({ user, children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="flex h-16 items-center px-4">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <NotificationCenter />
            <UserNav user={user} />
          </div>
        </div>
      </header>
      <main className="flex-1 space-y-4 p-8 pt-6">
        {children}
      </main>
    </div>
  )
} 