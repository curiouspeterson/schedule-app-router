'use client'

import { createClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push('/login')
      }
    }

    checkUser()
  }, [supabase.auth, router])

  return <DashboardLayout>{children}</DashboardLayout>
} 