import { useEffect } from 'react';
import { subscribeToAvailabilityChanges } from '@/lib/supabase/realtime';

interface AvailabilityNotificationsProps {
  organizationId: string;
}

export function AvailabilityNotifications({ organizationId }: AvailabilityNotificationsProps) {
  useEffect(() => {
    // Subscribe to availability changes
    const unsubscribe = subscribeToAvailabilityChanges(organizationId);

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [organizationId]);

  // This component doesn't render anything visible
  return null;
} 