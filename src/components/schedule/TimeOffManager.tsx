'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, isBefore } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useState } from 'react';

interface TimeOffManagerProps {
  employeeId: string;
}

interface TimeOffRequest {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export function TimeOffManager({ employeeId }: TimeOffManagerProps) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch time-off requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['timeOffRequests', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_off_requests')
        .select('*')
        .eq('employee_id', employeeId)
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data as TimeOffRequest[];
    },
  });

  // Mutation for creating time-off requests
  const createRequest = useMutation({
    mutationFn: async ({
      startDate,
      endDate,
    }: {
      startDate: string;
      endDate: string;
    }) => {
      const { error } = await supabase.from('time_off_requests').insert({
        employee_id: employeeId,
        start_date: startDate,
        end_date: endDate,
        status: 'pending',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeOffRequests'] });
      toast.success('Time-off request submitted successfully');
      setIsDialogOpen(false);
      setStartDate('');
      setEndDate('');
    },
    onError: (error) => {
      toast.error('Failed to submit time-off request');
      console.error('Error submitting time-off request:', error);
    },
  });

  const handleSubmit = () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    if (isBefore(new Date(endDate), new Date(startDate))) {
      toast.error('End date must be after start date');
      return;
    }

    createRequest.mutate({ startDate, endDate });
  };

  if (isLoading) {
    return <div>Loading time-off requests...</div>;
  }

  const getPendingRequests = () =>
    requests?.filter((request) => request.status === 'pending') || [];

  const getUpcomingApprovedRequests = () =>
    requests?.filter(
      (request) =>
        request.status === 'approved' &&
        isBefore(new Date(), new Date(request.end_date))
    ) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Time Off Requests</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Request Time Off</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Time Off</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <input
                  type="date"
                  className="w-full rounded-md border px-3 py-2"
                  min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <input
                  type="date"
                  className="w-full rounded-md border px-3 py-2"
                  min={startDate || format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>Submit Request</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {getPendingRequests().length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Pending Requests</h3>
            <div className="space-y-2">
              {getPendingRequests().map((request) => (
                <div
                  key={request.id}
                  className="rounded-lg border p-3 text-sm space-y-1"
                >
                  <p>
                    {format(new Date(request.start_date), 'PPP')} -{' '}
                    {format(new Date(request.end_date), 'PPP')}
                  </p>
                  <p className="text-muted-foreground">
                    Requested on {format(new Date(request.created_at), 'PPP')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {getUpcomingApprovedRequests().length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Upcoming Time Off</h3>
            <div className="space-y-2">
              {getUpcomingApprovedRequests().map((request) => (
                <div
                  key={request.id}
                  className="rounded-lg border p-3 text-sm space-y-1"
                >
                  <p>
                    {format(new Date(request.start_date), 'PPP')} -{' '}
                    {format(new Date(request.end_date), 'PPP')}
                  </p>
                  <p className="text-muted-foreground">Approved</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {getPendingRequests().length === 0 &&
          getUpcomingApprovedRequests().length === 0 && (
            <p className="text-muted-foreground">No upcoming time off</p>
          )}
      </div>
    </div>
  );
} 