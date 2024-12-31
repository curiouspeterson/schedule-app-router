import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addWeeks, startOfWeek, endOfWeek } from 'date-fns';
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
import { ScheduleDetails } from './ScheduleDetails';

interface Schedule {
  id: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'published';
  created_at: string;
}

export function ScheduleManager() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  // Fetch schedules
  const { data: schedules, isLoading } = useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data as Schedule[];
    },
  });

  // Mutation for creating schedules
  const createSchedule = useMutation({
    mutationFn: async () => {
      const startDate = startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 });
      const endDate = endOfWeek(startDate, { weekStartsOn: 1 });

      const { error } = await supabase.from('schedules').insert({
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        status: 'draft',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Schedule created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create schedule');
      console.error('Error creating schedule:', error);
    },
  });

  // Mutation for publishing schedules
  const publishSchedule = useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await supabase
        .from('schedules')
        .update({ status: 'published' })
        .eq('id', scheduleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Schedule published successfully');
      setIsDialogOpen(false);
      setSelectedSchedule(null);
    },
    onError: (error) => {
      toast.error('Failed to publish schedule');
      console.error('Error publishing schedule:', error);
    },
  });

  // Mutation for generating schedule assignments
  const generateAssignments = useMutation({
    mutationFn: async (scheduleId: string) => {
      const response = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate schedule');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['scheduleAssignments'] });
      toast.success('Schedule generated successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleViewSchedule = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div>Loading schedules...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Schedule Management</h2>
        <Button onClick={() => createSchedule.mutate()}>
          Create New Schedule
        </Button>
      </div>

      <div className="space-y-4">
        {schedules?.map((schedule) => (
          <div
            key={schedule.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div>
              <p className="font-medium">
                {format(new Date(schedule.start_date), 'PPP')} -{' '}
                {format(new Date(schedule.end_date), 'PPP')}
              </p>
              <p className="text-sm text-muted-foreground">
                Status: {schedule.status}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewSchedule(schedule)}
              >
                View
              </Button>
              {schedule.status === 'draft' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateAssignments.mutate(schedule.id)}
                  >
                    Generate
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => publishSchedule.mutate(schedule.id)}
                  >
                    Publish
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>View Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedSchedule && (
              <>
                <div>
                  <p className="font-medium">
                    {format(new Date(selectedSchedule.start_date), 'PPP')} -{' '}
                    {format(new Date(selectedSchedule.end_date), 'PPP')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Status: {selectedSchedule.status}
                  </p>
                </div>
                <ScheduleDetails
                  scheduleId={selectedSchedule.id}
                  startDate={selectedSchedule.start_date}
                  endDate={selectedSchedule.end_date}
                />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 