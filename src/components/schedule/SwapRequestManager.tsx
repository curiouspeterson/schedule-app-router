"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { ShiftSwapRequest } from '@/lib/scheduling/types';

interface SwapRequestManagerProps {
  employeeId: string;
}

export function SwapRequestManager({ employeeId }: SwapRequestManagerProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: swapRequests, isLoading } = useQuery({
    queryKey: ['shift-swaps', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_swap_requests')
        .select(`
          *,
          from_assignment:shift_assignments(
            *,
            shift:shifts(*),
            employee:profiles(id, name)
          )
        `)
        .eq('to_employee_id', employeeId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (ShiftSwapRequest & {
        from_assignment: {
          shift: {
            start_time: string;
            end_time: string;
            role: string;
          };
          employee: {
            id: string;
            name: string;
          };
        };
      })[];
    },
  });

  const updateSwapRequest = useMutation({
    mutationFn: async ({
      requestId,
      status,
    }: {
      requestId: string;
      status: 'approved' | 'rejected';
    }) => {
      const { error } = await supabase
        .from('shift_swap_requests')
        .update({ status })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-swaps'] });
      toast.success('Swap request updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update swap request');
      console.error('Error updating swap request:', error);
    },
  });

  const handleApprove = (requestId: string) => {
    updateSwapRequest.mutate({ requestId, status: 'approved' });
  };

  const handleReject = (requestId: string) => {
    updateSwapRequest.mutate({ requestId, status: 'rejected' });
  };

  if (isLoading) {
    return <div>Loading swap requests...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shift Swap Requests</CardTitle>
      </CardHeader>
      <CardContent>
        {swapRequests?.length ? (
          <div className="space-y-4">
            {swapRequests.map(request => (
              <div
                key={request.id}
                className="flex items-center justify-between bg-muted p-4 rounded"
              >
                <div>
                  <p className="font-medium">
                    {format(new Date(request.from_assignment.shift.start_time), 'EEEE, MMMM d')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(request.from_assignment.shift.start_time), 'h:mm a')} -{' '}
                    {format(new Date(request.from_assignment.shift.end_time), 'h:mm a')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {request.from_assignment.shift.role}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    From: {request.from_assignment.employee.name}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReject(request.id)}
                    disabled={updateSwapRequest.isPending}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request.id)}
                    disabled={updateSwapRequest.isPending}
                  >
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No pending swap requests</p>
        )}
      </CardContent>
    </Card>
  );
} 