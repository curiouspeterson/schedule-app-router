import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';

interface CoverageRequirement {
  id: string;
  day_of_week: number;
  required_staff: number;
  shift_id: string;
  shift: {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
  };
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

export function CoverageManager() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedRequirements, setEditedRequirements] = useState<Record<string, number>>({});

  // Fetch shifts
  const { data: shifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('start_time');

      if (error) throw error;
      return data;
    },
  });

  // Fetch coverage requirements
  const { data: requirements, isLoading } = useQuery({
    queryKey: ['coverageRequirements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coverage_requirements')
        .select(`
          *,
          shift:shifts(*)
        `)
        .order('day_of_week')
        .order('shift(start_time)');

      if (error) throw error;
      return data as CoverageRequirement[];
    },
  });

  // Mutation for updating coverage requirements
  const updateRequirements = useMutation({
    mutationFn: async (updates: { id: string; required_staff: number }[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from('coverage_requirements')
          .update({ required_staff: update.required_staff })
          .eq('id', update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coverageRequirements'] });
      toast.success('Coverage requirements updated successfully');
      setIsEditing(false);
      setEditedRequirements({});
    },
    onError: (error) => {
      toast.error('Failed to update coverage requirements');
      console.error('Error updating coverage requirements:', error);
    },
  });

  // Initialize coverage requirements for new shifts
  const initializeRequirements = useMutation({
    mutationFn: async (shiftId: string) => {
      const requirements = DAYS_OF_WEEK.map((_, index) => ({
        day_of_week: index + 1,
        required_staff: 1,
        shift_id: shiftId,
      }));

      const { error } = await supabase
        .from('coverage_requirements')
        .insert(requirements);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coverageRequirements'] });
      toast.success('Coverage requirements initialized successfully');
    },
    onError: (error) => {
      toast.error('Failed to initialize coverage requirements');
      console.error('Error initializing coverage requirements:', error);
    },
  });

  const handleEdit = (requirementId: string, value: number) => {
    setEditedRequirements((prev) => ({
      ...prev,
      [requirementId]: value,
    }));
  };

  const handleSave = () => {
    const updates = Object.entries(editedRequirements).map(([id, required_staff]) => ({
      id,
      required_staff,
    }));

    if (updates.length > 0) {
      updateRequirements.mutate(updates);
    } else {
      setIsEditing(false);
    }
  };

  if (isLoading) {
    return <div>Loading coverage requirements...</div>;
  }

  // Group requirements by day
  const requirementsByDay = requirements?.reduce((acc, req) => {
    if (!acc[req.day_of_week]) {
      acc[req.day_of_week] = [];
    }
    acc[req.day_of_week].push(req);
    return acc;
  }, {} as Record<number, CoverageRequirement[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Coverage Requirements</h2>
        <div className="flex gap-2">
          {shifts?.map((shift) => {
            const hasRequirements = requirements?.some(
              (req) => req.shift_id === shift.id
            );
            if (!hasRequirements) {
              return (
                <Button
                  key={shift.id}
                  variant="outline"
                  size="sm"
                  onClick={() => initializeRequirements.mutate(shift.id)}
                >
                  Initialize {shift.name}
                </Button>
              );
            }
            return null;
          })}
          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                setIsEditing(false);
                setEditedRequirements({});
              }}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit Requirements</Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {DAYS_OF_WEEK.map((day, index) => {
          const dayRequirements = requirementsByDay?.[index + 1] || [];

          return (
            <div key={day} className="space-y-2">
              <h3 className="font-medium">{day}</h3>
              <div className="space-y-2">
                {dayRequirements.map((requirement) => (
                  <div
                    key={requirement.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div>
                      <p className="font-medium">{requirement.shift.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {requirement.shift.start_time} - {requirement.shift.end_time}
                      </p>
                    </div>
                    {isEditing ? (
                      <input
                        type="number"
                        className="w-20 rounded-md border px-3 py-2"
                        min="0"
                        value={
                          editedRequirements[requirement.id] !== undefined
                            ? editedRequirements[requirement.id]
                            : requirement.required_staff
                        }
                        onChange={(e) =>
                          handleEdit(requirement.id, parseInt(e.target.value))
                        }
                      />
                    ) : (
                      <p className="font-medium">
                        {requirement.required_staff} staff required
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 