"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { MainNav } from '@/components/navigation/MainNav';

const queryClient = new QueryClient();

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!session || error) {
        router.push('/login');
        return;
      }

      // Fetch user's manager status
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_manager')
        .eq('id', session.user.id)
        .single();

      setIsManager(profile?.is_manager || false);
      setIsLoading(false);
    };

    checkAuth();
  }, [router, supabase.auth]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <div className="mr-4 flex">
              <a className="mr-6 flex items-center space-x-2" href="/">
                <span className="font-bold">ScheduleMe</span>
              </a>
            </div>
            <MainNav isManager={isManager} />
            <div className="flex items-center space-x-2">
              <NotificationCenter />
            </div>
          </div>
        </header>
        <main className="container mx-auto py-6">{children}</main>
        <Toaster />
      </div>
    </QueryClientProvider>
  );
} 