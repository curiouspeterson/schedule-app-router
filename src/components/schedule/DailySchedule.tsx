// Daily schedule component - Displays and manages the schedule for a single day

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { RequestSwapDialog } from './RequestSwapDialog';
import { toast } from 'sonner';

interface DailyScheduleProps {
  date: Date;
  scheduleId: string;
}

export function DailySchedule({ date, scheduleId }: DailyScheduleProps) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Fetch assignments for the day
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['scheduleAssignments', scheduleId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_assignments')
        .select(`
          *,
          employee:profiles(*),
          shift:shifts(*)
        `)
        .eq('schedule_id', scheduleId)
        .eq('date', format(date, 'yyyy-MM-dd'))
        .order('shift(start_time)', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    },
  });

  // Mutation for requesting shift swaps
  const requestSwap = useMutation({
    mutationFn: async ({
      shiftAssignmentId,
      targetEmployeeId,
    }: {
      shiftAssignmentId: string;
      targetEmployeeId: string;
    }) => {
      const response = await fetch('/api/schedule/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftAssignmentId, targetEmployeeId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to request shift swap');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swapRequests'] });
      toast.success('Shift swap request sent successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return <div>Loading schedule...</div>;
  }

  return (
    <div className="space-y-2">
      {assignments?.length === 0 ? (
        <p className="text-muted-foreground">No shifts scheduled</p>
      ) : (
        <div className="space-y-2">
          {assignments?.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <p className="font-medium">
                  {assignment.shift.name} ({assignment.shift.start_time} -{' '}
                  {assignment.shift.end_time})
                </p>
                <p className="text-sm text-muted-foreground">
                  {assignment.employee.name}
                </p>
              </div>
              {currentUser?.id === assignment.employee_id && (
                <RequestSwapDialog
                  shiftAssignmentId={assignment.id}
                  date={date}
                  shiftName={`${assignment.shift.name} (${assignment.shift.start_time} - ${assignment.shift.end_time})`}
                  onRequestSwap={(targetEmployeeId) =>
                    requestSwap.mutate({
                      shiftAssignmentId: assignment.id,
                      targetEmployeeId,
                    })
                  }
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 