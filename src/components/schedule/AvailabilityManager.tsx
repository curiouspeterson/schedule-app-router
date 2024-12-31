"use client"

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { validateAvailabilitySlots } from '@/lib/scheduling/validation';

interface AvailabilityManagerProps {
  employeeId: string;
}

interface TimeSlot {
  day: string;
  start_time: string;
  end_time: string;
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

export function AvailabilityManager({ employeeId }: AvailabilityManagerProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState(DAYS_OF_WEEK[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  const { data: availabilitySlots, isLoading } = useQuery({
    queryKey: ['availability', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('employee_id', employeeId);

      if (error) throw error;
      return data as TimeSlot[];
    },
  });

  const addAvailability = useMutation({
    mutationFn: async (newSlot: Omit<TimeSlot, 'id'>) => {
      const { error } = await supabase
        .from('availability')
        .insert([{ employee_id: employeeId, ...newSlot }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability', employeeId] });
      toast.success('Availability updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update availability');
      console.error('Error updating availability:', error);
    },
  });

  const removeAvailability = useMutation({
    mutationFn: async (slot: TimeSlot) => {
      const { error } = await supabase
        .from('availability')
        .delete()
        .eq('employee_id', employeeId)
        .eq('day', slot.day)
        .eq('start_time', slot.start_time)
        .eq('end_time', slot.end_time);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability', employeeId] });
      toast.success('Availability removed successfully');
    },
    onError: (error) => {
      toast.error('Failed to remove availability');
      console.error('Error removing availability:', error);
    },
  });

  const handleAddSlot = () => {
    const newSlot = {
      day: selectedDay,
      start_time: startTime,
      end_time: endTime,
    };

    const existingDaySlots = availabilitySlots?.filter(
      (slot) => slot.day === selectedDay
    ) || [];

    const validationError = validateAvailabilitySlots(newSlot, existingDaySlots);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    addAvailability.mutate(newSlot);
  };

  const getDaySlots = (day: string) => {
    return availabilitySlots?.filter((slot) => slot.day === day) || [];
  };

  if (isLoading) {
    return <div>Loading availability...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label>Day of Week</Label>
          <select
            className="w-full rounded-md border p-2"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
          >
            {DAYS_OF_WEEK.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Time</Label>
            <select
              className="w-full rounded-md border p-2"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            >
              {TIME_SLOTS.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>End Time</Label>
            <select
              className="w-full rounded-md border p-2"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            >
              {TIME_SLOTS.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button onClick={handleAddSlot}>Add Availability</Button>
      </div>

      <div className="space-y-4">
        {DAYS_OF_WEEK.map((day) => {
          const slots = getDaySlots(day);
          return (
            <div key={day} className="space-y-2">
              <h3 className="font-medium">{day}</h3>
              {slots.length > 0 ? (
                <div className="space-y-2">
                  {slots.map((slot) => (
                    <div
                      key={`${slot.day}-${slot.start_time}-${slot.end_time}`}
                      className="flex items-center justify-between rounded-lg border p-2"
                    >
                      <span>
                        {slot.start_time} - {slot.end_time}
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeAvailability.mutate(slot)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No availability set</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 