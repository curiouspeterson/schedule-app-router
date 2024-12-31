'use client';

import { useEffect } from 'react';
import { subscribeToAvailabilityUpdates } from '@/lib/supabase/realtime';

export function AvailabilityNotifications() {
  useEffect(() => {
    subscribeToAvailabilityUpdates();
  }, []);

  return null;
} 