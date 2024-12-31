import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';

interface SchedulingConstraints {
  id: string;
  max_hours_per_day: number;
  min_hours_between_shifts: number;
  max_consecutive_days: number;
  created_at: string;
  updated_at: string;
}

const DEFAULT_CONSTRAINTS = {
  max_hours_per_day: 8,
  min_hours_between_shifts: 10,
  max_consecutive_days: 5,
};

export function ConstraintsManager() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [isEditing, setIsEditing] = useState(false);
  const [maxHoursPerDay, setMaxHoursPerDay] = useState('8');
  const [minHoursBetweenShifts, setMinHoursBetweenShifts] = useState('10');
  const [maxConsecutiveDays, setMaxConsecutiveDays] = useState('5');

  // Fetch constraints
  const { data: constraints, isLoading } = useQuery({
    queryKey: ['schedulingConstraints'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduling_constraints')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
      return data as SchedulingConstraints | null;
    },
  });

  // Mutation for updating constraints
  const updateConstraints = useMutation({
    mutationFn: async (constraints: Omit<SchedulingConstraints, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase
        .from('scheduling_constraints')
        .upsert(constraints)
        .select()
        .single();

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulingConstraints'] });
      toast.success('Scheduling constraints updated successfully');
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error('Failed to update scheduling constraints');
      console.error('Error updating constraints:', error);
    },
  });

  const handleEdit = () => {
    const current = constraints || DEFAULT_CONSTRAINTS;
    setMaxHoursPerDay(current.max_hours_per_day.toString());
    setMinHoursBetweenShifts(current.min_hours_between_shifts.toString());
    setMaxConsecutiveDays(current.max_consecutive_days.toString());
    setIsEditing(true);
  };

  const handleSave = () => {
    updateConstraints.mutate({
      max_hours_per_day: parseInt(maxHoursPerDay),
      min_hours_between_shifts: parseInt(minHoursBetweenShifts),
      max_consecutive_days: parseInt(maxConsecutiveDays),
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (isLoading) {
    return <div>Loading scheduling constraints...</div>;
  }

  const currentConstraints = constraints || DEFAULT_CONSTRAINTS;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Scheduling Constraints</h2>
        {isEditing ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        ) : (
          <Button onClick={handleEdit}>Edit Constraints</Button>
        )}
      </div>

      <div className="grid gap-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Maximum Hours Per Day</p>
              <p className="text-sm text-muted-foreground">
                The maximum number of hours an employee can work in a single day
              </p>
            </div>
            {isEditing ? (
              <input
                type="number"
                className="w-20 rounded-md border px-3 py-2"
                min="1"
                max="24"
                value={maxHoursPerDay}
                onChange={(e) => setMaxHoursPerDay(e.target.value)}
              />
            ) : (
              <p className="font-medium">{currentConstraints.max_hours_per_day} hours</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Minimum Hours Between Shifts</p>
              <p className="text-sm text-muted-foreground">
                The minimum number of hours required between an employee's shifts
              </p>
            </div>
            {isEditing ? (
              <input
                type="number"
                className="w-20 rounded-md border px-3 py-2"
                min="0"
                max="24"
                value={minHoursBetweenShifts}
                onChange={(e) => setMinHoursBetweenShifts(e.target.value)}
              />
            ) : (
              <p className="font-medium">{currentConstraints.min_hours_between_shifts} hours</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Maximum Consecutive Days</p>
              <p className="text-sm text-muted-foreground">
                The maximum number of consecutive days an employee can work
              </p>
            </div>
            {isEditing ? (
              <input
                type="number"
                className="w-20 rounded-md border px-3 py-2"
                min="1"
                max="14"
                value={maxConsecutiveDays}
                onChange={(e) => setMaxConsecutiveDays(e.target.value)}
              />
            ) : (
              <p className="font-medium">{currentConstraints.max_consecutive_days} days</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 