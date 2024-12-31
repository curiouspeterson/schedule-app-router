import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ShiftSwapManagerProps {
  employeeId: string;
}

export function ShiftSwapManager({ employeeId }: ShiftSwapManagerProps) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Fetch pending swap requests for the employee
  const { data: swapRequests, isLoading } = useQuery({
    queryKey: ['swapRequests', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_swap_requests')
        .select(`
          *,
          requesting_employee:profiles!requesting_employee_id(*),
          target_employee:profiles!target_employee_id(*),
          shift_assignment:schedule_assignments(
            *,
            shift:shifts(*)
          )
        `)
        .or(`requesting_employee_id.eq.${employeeId},target_employee_id.eq.${employeeId}`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Mutation for responding to swap requests
  const respondToSwap = useMutation({
    mutationFn: async ({
      swapId,
      action,
    }: {
      swapId: string;
      action: 'approve' | 'reject';
    }) => {
      const response = await fetch(`/api/schedule/swap/${swapId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process swap request');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swapRequests'] });
      queryClient.invalidateQueries({ queryKey: ['scheduleAssignments'] });
      toast.success('Shift swap request processed successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Mutation for creating swap requests
  const createSwapRequest = useMutation({
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
        throw new Error(error.error || 'Failed to create swap request');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swapRequests'] });
      toast.success('Shift swap request created successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return <div>Loading swap requests...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Shift Swap Requests</h2>
      {swapRequests?.length === 0 ? (
        <p className="text-muted-foreground">No pending swap requests</p>
      ) : (
        <div className="space-y-4">
          {swapRequests?.map((request) => (
            <div
              key={request.id}
              className="rounded-lg border p-4 shadow-sm space-y-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {request.requesting_employee.id === employeeId
                      ? `Requested swap with ${request.target_employee.name}`
                      : `${request.requesting_employee.name} wants to swap with you`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Shift: {format(new Date(request.shift_assignment.date), 'PPP')}{' '}
                    {request.shift_assignment.shift.start_time} -{' '}
                    {request.shift_assignment.shift.end_time}
                  </p>
                </div>
                {request.target_employee_id === employeeId && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        respondToSwap.mutate({
                          swapId: request.id,
                          action: 'reject',
                        })
                      }
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        respondToSwap.mutate({
                          swapId: request.id,
                          action: 'approve',
                        })
                      }
                    >
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 