"use client"

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek, addDays } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { ShiftAssignment, Employee } from '@/lib/scheduling/types';

interface AssignmentManagerProps {
  isManager: boolean;
}

interface AssignmentWithEmployee extends ShiftAssignment {
  employee: Pick<Employee, 'id' | 'email'>;
}

export function AssignmentManager({ isManager }: AssignmentManagerProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const weekStart = startOfWeek(currentDate);
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: assignments, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['assignments', weekStart],
    queryFn: async () => {
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('shift_assignments')
        .select(`
          *,
          shift:shifts(*),
          employee:profiles(id, email)
        `)
        .gte('shift.start_time', startDate)
        .lte('shift.start_time', endDate)
        .order('shift.start_time');

      if (error) throw error;
      return data as AssignmentWithEmployee[];
    },
    enabled: isManager,
  });

  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Employee[];
    },
    enabled: isManager,
  });

  const updateAssignment = useMutation({
    mutationFn: async ({
      assignmentId,
      employeeId,
    }: {
      assignmentId: string;
      employeeId: string;
    }) => {
      const { error } = await supabase
        .from('shift_assignments')
        .update({ employee_id: employeeId })
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('Assignment updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update assignment');
      console.error('Error updating assignment:', error);
    },
  });

  const handlePreviousWeek = () => {
    setCurrentDate(prev => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setCurrentDate(prev => addDays(prev, 7));
  };

  const handleEmployeeChange = (assignmentId: string, employeeId: string) => {
    updateAssignment.mutate({ assignmentId, employeeId });
  };

  if (!isManager) {
    return null;
  }

  if (isLoadingAssignments || isLoadingEmployees) {
    return <div>Loading assignments...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Shift Assignments</CardTitle>
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
              a => a.shift && format(new Date(a.shift.start_time), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
            );

            return (
              <div key={dayOffset} className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">
                  {format(date, 'EEEE, MMMM d')}
                </h3>
                {dayAssignments?.length ? (
                  <div className="space-y-4">
                    {dayAssignments.map(assignment => assignment.shift && (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between bg-muted p-4 rounded"
                      >
                        <div>
                          <p className="font-medium">
                            {format(new Date(assignment.shift.start_time), 'h:mm a')} -{' '}
                            {format(new Date(assignment.shift.end_time), 'h:mm a')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {assignment.shift.role}
                          </p>
                        </div>
                        <div className="w-64">
                          <Label>Assigned Employee</Label>
                          <Select
                            value={assignment.employee_id}
                            onValueChange={(value) => handleEmployeeChange(assignment.id, value)}
                          >
                            <SelectTrigger>
                              <SelectValue>
                                {employees?.find(e => e.id === assignment.employee_id)?.name ||
                                  'Select employee'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {employees?.map(employee => (
                                <SelectItem key={employee.id} value={employee.id}>
                                  {employee.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
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