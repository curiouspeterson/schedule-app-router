// Shift assignment component - Handles the assignment of employees to shifts

import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, Trash2 } from 'lucide-react';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface Shift {
  id: string;
  start_time: string;
  end_time: string;
  role: string;
}

interface ShiftAssignment {
  id: string;
  date: string;
  employee: Employee;
  shift: Shift;
}

interface ShiftAssignmentProps {
  assignment: ShiftAssignment;
}

export default function ShiftAssignment({ assignment }: ShiftAssignmentProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { mutate: deleteAssignment } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('schedule_assignments')
        .delete()
        .eq('id', assignment.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });

  const handleEdit = () => {
    // TODO: Implement edit functionality
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this shift assignment?')) {
      deleteAssignment();
    }
  };

  return (
    <div className="p-2 bg-white border rounded-md shadow-sm">
      <div className="flex justify-between items-center">
        <div>
          <div className="font-medium">
            {assignment.employee.first_name} {assignment.employee.last_name}
          </div>
          <div className="text-sm text-gray-600">
            {format(new Date(`${assignment.date}T${assignment.shift.start_time}`), 'h:mm a')} -
            {format(new Date(`${assignment.date}T${assignment.shift.end_time}`), 'h:mm a')}
          </div>
          <div className="text-xs text-gray-500">{assignment.shift.role}</div>
        </div>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" onClick={handleEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
} 