'use client'

import { User } from '@supabase/supabase-js'
import { MainNav } from '@/components/navigation/MainNav'
import { UserNav } from '@/components/navigation/UserNav'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'

interface DashboardLayoutProps {
  user: User
  children: React.ReactNode
}

export function DashboardLayout({ user, children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <MainNav />
          <div className="ml-auto flex items-center space-x-4">
            <NotificationCenter />
            <UserNav user={user} />
          </div>
        </div>
      </header>
      <main className="flex-1 space-y-4 p-8 pt-6">
        <div className="container">
          {children}
        </div>
      </main>
    </div>
  )
} 