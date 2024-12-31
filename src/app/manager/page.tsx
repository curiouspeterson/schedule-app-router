"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AssignmentManager } from '@/components/schedule/AssignmentManager';
import { OrganizationSchedule } from '@/components/schedule/OrganizationSchedule';
import { RoleManager } from '@/components/schedule/RoleManager';
import { ScheduleGenerator } from '@/components/schedule/ScheduleGenerator';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function ManagerPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isManager, setIsManager] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!session || error) {
        router.push('/login');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_manager, organization_id')
        .eq('id', session.user.id)
        .single();

      if (profileError || !profile?.is_manager) {
        router.push('/dashboard');
        return;
      }

      setIsManager(true);
      setOrganizationId(profile.organization_id);
    };

    checkAuth();
  }, [router, supabase.auth]);

  if (!isManager || !organizationId) {
    return <div>Loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-8">Manager Dashboard</h1>
        <div className="grid gap-8">
          <ScheduleGenerator organizationId={organizationId} />
          <AssignmentManager isManager={isManager} />
          <OrganizationSchedule organizationId={organizationId} />
          <RoleManager organizationId={organizationId} />
        </div>
      </div>
    </QueryClientProvider>
  );
} 