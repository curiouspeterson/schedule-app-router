import { useQuery } from '@tanstack/react-query';
import { format, addDays, startOfWeek } from 'date-fns';
import { createClient } from '@/lib/supabase/client';

interface ScheduleDetailsProps {
  scheduleId: string;
  startDate: string;
  endDate: string;
}

interface Assignment {
  id: string;
  employee_id: string;
  shift_id: string;
  date: string;
  employee: {
    id: string;
    name: string;
    email: string;
  };
  shift: {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
  };
}

export function ScheduleDetails({
  scheduleId,
  startDate,
  endDate,
}: ScheduleDetailsProps) {
  const supabase = createClient();
  const weekStart = startOfWeek(new Date(startDate), { weekStartsOn: 1 });

  // Fetch schedule assignments
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['scheduleAssignments', scheduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_assignments')
        .select(`
          *,
          employee:profiles(*),
          shift:shifts(*)
        `)
        .eq('schedule_id', scheduleId)
        .order('date')
        .order('shift(start_time)');

      if (error) throw error;
      return data as Assignment[];
    },
  });

  if (isLoading) {
    return <div>Loading schedule details...</div>;
  }

  // Group assignments by day
  const assignmentsByDay = assignments?.reduce((acc, assignment) => {
    const date = assignment.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(assignment);
    return acc;
  }, {} as Record<string, Assignment[]>);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-4">
        {Array.from({ length: 7 }, (_, i) => {
          const date = format(addDays(weekStart, i), 'yyyy-MM-dd');
          const dayAssignments = assignmentsByDay?.[date] || [];

          return (
            <div
              key={date}
              className="rounded-lg border p-4 space-y-2"
            >
              <div className="text-center">
                <p className="font-medium">
                  {format(addDays(weekStart, i), 'EEE')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(addDays(weekStart, i), 'MMM d')}
                </p>
              </div>
              {dayAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center">
                  No shifts
                </p>
              ) : (
                <div className="space-y-2">
                  {dayAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="rounded border p-2 text-sm space-y-1"
                    >
                      <p className="font-medium">{assignment.shift.name}</p>
                      <p className="text-muted-foreground">
                        {assignment.shift.start_time} -{' '}
                        {assignment.shift.end_time}
                      </p>
                      <p className="text-xs">{assignment.employee.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 