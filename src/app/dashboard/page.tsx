"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { EmployeeSchedule } from '@/components/schedule/EmployeeSchedule';
import { SwapRequestManager } from '@/components/schedule/SwapRequestManager';
import { SwapRequestHistory } from '@/components/schedule/SwapRequestHistory';
import { SchedulePreferencesPanel } from '@/components/schedule/SchedulePreferencesPanel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!session || error) {
        router.push('/login');
        return;
      }

      setUserId(session.user.id);
    };

    checkAuth();
  }, [router, supabase.auth]);

  if (!userId) {
    return <div>Loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-8">Employee Dashboard</h1>
        <div className="grid gap-8">
          <EmployeeSchedule employeeId={userId} />
          <SchedulePreferencesPanel employeeId={userId} />
          <SwapRequestManager employeeId={userId} />
          <SwapRequestHistory employeeId={userId} />
        </div>
      </div>
    </QueryClientProvider>
  );
} 