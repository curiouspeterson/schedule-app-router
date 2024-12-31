import { createClient } from './client';
import { toast } from 'sonner';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface AvailabilityPattern {
  id: string;
  employee_id: string;
  organization_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface AvailabilityChange {
  employee_id: string;
  employee_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

const daysOfWeek = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function subscribeToAvailabilityChanges(organizationId: string) {
  const supabase = createClient();

  // Subscribe to availability pattern changes
  const availabilityChannel = supabase.channel('availability-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'availability_patterns',
        filter: `organization_id=eq.${organizationId}`,
      },
      async (payload: RealtimePostgresChangesPayload<AvailabilityPattern>) => {
        if (!payload.new) return;

        // Fetch employee details
        const { data: employee } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', payload.new.employee_id)
          .single();

        if (!employee) return;

        const change: AvailabilityChange = {
          employee_id: payload.new.employee_id,
          employee_name: employee.full_name,
          day_of_week: payload.new.day_of_week,
          start_time: payload.new.start_time,
          end_time: payload.new.end_time,
        };

        handleAvailabilityChange(payload.eventType, change);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(availabilityChannel);
  };
}

function handleAvailabilityChange(eventType: string, change: AvailabilityChange) {
  const day = daysOfWeek[change.day_of_week];
  const timeRange = `${formatTime(change.start_time)} - ${formatTime(change.end_time)}`;

  switch (eventType) {
    case 'INSERT':
      toast.info(
        `New Availability Added`,
        {
          description: `${change.employee_name} is now available on ${day}s from ${timeRange}`,
        }
      );
      break;
    case 'UPDATE':
      toast.info(
        `Availability Updated`,
        {
          description: `${change.employee_name} updated their availability on ${day}s to ${timeRange}`,
        }
      );
      break;
    case 'DELETE':
      toast.info(
        `Availability Removed`,
        {
          description: `${change.employee_name} removed their availability on ${day}s`,
        }
      );
      break;
  }
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${period}`;
} 