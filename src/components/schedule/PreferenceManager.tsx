"use client"

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { validateConstraints } from '@/lib/scheduling/validation';

interface PreferenceManagerProps {
  employeeId: string;
}

interface ShiftPreference {
  id?: string;
  employee_id: string;
  day: string;
  time_range: string;
  preference_type: 'preferred' | 'neutral' | 'avoid';
}

interface Constraints {
  max_weekly_hours: number;
  max_consecutive_days: number;
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

const TIME_RANGES = [
  'Morning (6:00 - 12:00)',
  'Afternoon (12:00 - 18:00)',
  'Evening (18:00 - 24:00)',
];

const PREFERENCE_TYPES = [
  { value: 'preferred', label: 'Preferred' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'avoid', label: 'Avoid' },
];

export function PreferenceManager({ employeeId }: PreferenceManagerProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState(DAYS_OF_WEEK[0]);
  const [selectedTimeRange, setSelectedTimeRange] = useState(TIME_RANGES[0]);
  const [selectedPreference, setSelectedPreference] = useState<'preferred' | 'neutral' | 'avoid'>('neutral');
  const [maxWeeklyHours, setMaxWeeklyHours] = useState(40);
  const [maxConsecutiveDays, setMaxConsecutiveDays] = useState(5);

  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ['shift-preferences', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_preferences')
        .select('*')
        .eq('employee_id', employeeId);

      if (error) throw error;
      return data as ShiftPreference[];
    },
  });

  const { data: constraints, isLoading: constraintsLoading } = useQuery({
    queryKey: ['constraints', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_constraints')
        .select('*')
        .eq('employee_id', employeeId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as Constraints;
    },
  });

  const addPreference = useMutation({
    mutationFn: async (newPreference: Omit<ShiftPreference, 'id'>) => {
      const { error } = await supabase
        .from('shift_preferences')
        .insert([newPreference]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-preferences', employeeId] });
      toast.success('Shift preference added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add shift preference');
      console.error('Error adding shift preference:', error);
    },
  });

  const removePreference = useMutation({
    mutationFn: async (preferenceId: string) => {
      const { error } = await supabase
        .from('shift_preferences')
        .delete()
        .eq('id', preferenceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-preferences', employeeId] });
      toast.success('Shift preference removed successfully');
    },
    onError: (error) => {
      toast.error('Failed to remove shift preference');
      console.error('Error removing shift preference:', error);
    },
  });

  const updateConstraints = useMutation({
    mutationFn: async (newConstraints: Constraints) => {
      const { error } = await supabase
        .from('employee_constraints')
        .upsert([{ employee_id: employeeId, ...newConstraints }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['constraints', employeeId] });
      toast.success('Constraints updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update constraints');
      console.error('Error updating constraints:', error);
    },
  });

  const handleAddPreference = () => {
    // Check if a preference for this day and time range already exists
    const existingPreference = preferences?.find(
      (pref) => pref.day === selectedDay && pref.time_range === selectedTimeRange
    );

    if (existingPreference) {
      toast.error('A preference for this day and time range already exists');
      return;
    }

    addPreference.mutate({
      employee_id: employeeId,
      day: selectedDay,
      time_range: selectedTimeRange,
      preference_type: selectedPreference,
    });
  };

  const handleUpdateConstraints = () => {
    const validationError = validateConstraints(maxWeeklyHours, maxConsecutiveDays);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    updateConstraints.mutate({
      max_weekly_hours: maxWeeklyHours,
      max_consecutive_days: maxConsecutiveDays,
    });
  };

  if (preferencesLoading || constraintsLoading) {
    return <div>Loading preferences...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Shift Preferences</h3>
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

          <div className="space-y-2">
            <Label>Time Range</Label>
            <select
              className="w-full rounded-md border p-2"
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
            >
              {TIME_RANGES.map((range) => (
                <option key={range} value={range}>
                  {range}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Preference</Label>
            <select
              className="w-full rounded-md border p-2"
              value={selectedPreference}
              onChange={(e) => setSelectedPreference(e.target.value as 'preferred' | 'neutral' | 'avoid')}
            >
              {PREFERENCE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={handleAddPreference}>Add Preference</Button>
        </div>

        <div className="space-y-4">
          {DAYS_OF_WEEK.map((day) => {
            const dayPreferences = preferences?.filter((pref) => pref.day === day) || [];
            return (
              <div key={day} className="space-y-2">
                <h4 className="font-medium">{day}</h4>
                {dayPreferences.length > 0 ? (
                  <div className="space-y-2">
                    {dayPreferences.map((pref) => (
                      <div
                        key={pref.id}
                        className="flex items-center justify-between rounded-lg border p-2"
                      >
                        <div>
                          <span className="font-medium">{pref.time_range}</span>
                          <span className="ml-2 text-muted-foreground">
                            ({pref.preference_type})
                          </span>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => pref.id && removePreference.mutate(pref.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No preferences set</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-medium">Scheduling Constraints</h3>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Maximum Weekly Hours</Label>
            <input
              type="number"
              className="w-full rounded-md border p-2"
              min="0"
              max="168"
              value={maxWeeklyHours}
              onChange={(e) => setMaxWeeklyHours(parseInt(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>Maximum Consecutive Days</Label>
            <input
              type="number"
              className="w-full rounded-md border p-2"
              min="0"
              max="7"
              value={maxConsecutiveDays}
              onChange={(e) => setMaxConsecutiveDays(parseInt(e.target.value))}
            />
          </div>

          <Button onClick={handleUpdateConstraints}>Update Constraints</Button>
        </div>
      </div>
    </div>
  );
} 