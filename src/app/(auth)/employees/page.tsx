import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { EmployeeList } from '@/components/employees/EmployeeList'

export default async function EmployeesPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // Get user profile to check if they're a manager
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !profile.is_manager) {
    redirect('/dashboard')
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Employees</h1>
      <EmployeeList organizationId={profile.organization_id} />
    </div>
  )
} 