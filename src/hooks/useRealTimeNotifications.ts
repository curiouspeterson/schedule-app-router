import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export function useRealTimeNotifications() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          // Invalidate and refetch notifications
          queryClient.invalidateQueries({ queryKey: ['notifications'] });

          // Show toast notification
          const notification = payload.new as {
            title: string;
            message: string;
          };

          toast({
            title: notification.title,
            description: notification.message,
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);
} 