"use client"

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useRealTimeNotifications } from '@/hooks/useRealTimeNotifications';

interface Notification {
  id: string;
  type: 'schedule_published' | 'schedule_review' | 'assignment_changed' | 'shift_added' | 'shift_removed';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export function NotificationCenter() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // Subscribe to real-time notifications
  useRealTimeNotifications();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead.mutateAsync(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
    setIsOpen(false);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Notifications</SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead.mutate()}
              >
                Mark all as read
              </Button>
            )}
          </div>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {isLoading ? (
            <p className="text-center text-muted-foreground">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p className="text-center text-muted-foreground">No notifications</p>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted ${
                  !notification.read ? 'border-primary' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`font-medium ${!notification.read ? 'text-primary' : ''}`}>
                      {notification.title}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
} 