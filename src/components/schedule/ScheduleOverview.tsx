"use client"

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, addDays } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { ShiftAssignment } from '@/lib/scheduling/types';

interface ScheduleOverviewProps {
  employeeId: string;
}

export function ScheduleOverview({ employeeId }: ScheduleOverviewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const weekStart = startOfWeek(currentDate);
  const supabase = createClient();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['schedule', employeeId, weekStart],
    queryFn: async () => {
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('shift_assignments')
        .select(`
          *,
          shift:shifts(*)
        `)
        .eq('employee_id', employeeId)
        .gte('shift.start_time', startDate)
        .lte('shift.start_time', endDate)
        .order('shift.start_time');

      if (error) throw error;
      return data as ShiftAssignment[];
    },
  });

  const handlePreviousWeek = () => {
    setCurrentDate(prev => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setCurrentDate(prev => addDays(prev, 7));
  };

  if (isLoading) {
    return <div>Loading schedule...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Schedule Overview</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePreviousWeek}>
              Previous Week
            </Button>
            <Button variant="outline" onClick={handleNextWeek}>
              Next Week
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {[0, 1, 2, 3, 4, 5, 6].map(dayOffset => {
            const date = addDays(weekStart, dayOffset);
            const dayAssignments = assignments?.filter(
              a => format(new Date(a.shift.start_time), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
            );

            return (
              <div key={dayOffset} className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">
                  {format(date, 'EEEE, MMMM d')}
                </h3>
                {dayAssignments?.length ? (
                  <div className="space-y-2">
                    {dayAssignments.map(assignment => (
                      <div
                        key={assignment.id}
                        className="flex justify-between items-center bg-muted p-2 rounded"
                      >
                        <span>
                          {format(new Date(assignment.shift.start_time), 'h:mm a')} -{' '}
                          {format(new Date(assignment.shift.end_time), 'h:mm a')}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {assignment.shift.role}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No shifts scheduled</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
} 