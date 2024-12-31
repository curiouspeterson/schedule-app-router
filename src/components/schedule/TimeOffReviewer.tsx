import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isBefore } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface TimeOffRequest {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  employee: {
    id: string;
    name: string;
    email: string;
  };
}

export function TimeOffReviewer() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Fetch pending time-off requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['pendingTimeOffRequests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_off_requests')
        .select(`
          *,
          employee:profiles(*)
        `)
        .eq('status', 'pending')
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data as TimeOffRequest[];
    },
  });

  // Mutation for responding to time-off requests
  const respondToRequest = useMutation({
    mutationFn: async ({
      requestId,
      action,
    }: {
      requestId: string;
      action: 'approve' | 'reject';
    }) => {
      const response = await fetch(`/api/time-off/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process time-off request');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingTimeOffRequests'] });
      toast.success('Time-off request processed successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return <div>Loading time-off requests...</div>;
  }

  const getPendingRequests = () =>
    requests?.filter((request) => isBefore(new Date(), new Date(request.end_date))) || [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Pending Time Off Requests</h2>
      <div className="space-y-4">
        {getPendingRequests().length === 0 ? (
          <p className="text-muted-foreground">No pending requests</p>
        ) : (
          getPendingRequests().map((request) => (
            <div
              key={request.id}
              className="rounded-lg border p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{request.employee.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {request.employee.email}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      respondToRequest.mutate({
                        requestId: request.id,
                        action: 'reject',
                      })
                    }
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      respondToRequest.mutate({
                        requestId: request.id,
                        action: 'approve',
                      })
                    }
                  >
                    Approve
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-sm">
                  {format(new Date(request.start_date), 'PPP')} -{' '}
                  {format(new Date(request.end_date), 'PPP')}
                </p>
                <p className="text-xs text-muted-foreground">
                  Requested on {format(new Date(request.created_at), 'PPP')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 