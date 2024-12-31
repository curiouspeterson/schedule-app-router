import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { EmployeeAvailabilityOverview } from '@/components/schedule/EmployeeAvailabilityOverview';
import { Toaster } from '@/components/ui/toaster';
import { AvailabilityNotifications } from '@/components/schedule/AvailabilityNotifications';

export default async function ManagerAvailabilityPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // Get user profile to check if they're a manager
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !profile.is_manager) {
    redirect('/dashboard');
  }

  return (
    <main className="container mx-auto p-4 space-y-8">
      <h1 className="text-3xl font-bold">Employee Availability</h1>
      <EmployeeAvailabilityOverview organizationId={profile.organization_id} />
      <AvailabilityNotifications />
      <Toaster />
    </main>
  );
} 