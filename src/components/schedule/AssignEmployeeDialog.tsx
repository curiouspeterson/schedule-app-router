import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

interface AssignEmployeeDialogProps {
  date: Date;
  shiftId?: string;
  employeeId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AssignEmployeeDialog({
  date,
  shiftId,
  employeeId,
  isOpen,
  onClose,
}: AssignEmployeeDialogProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [selectedShift, setSelectedShift] = React.useState(shiftId);
  const [selectedEmployee, setSelectedEmployee] = React.useState(employeeId);

  // Fetch available shifts
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

  // Fetch available employees
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'employee');

      if (error) throw error;
      return data;
    },
  });

  // Mutation for assigning shift
  const { mutate: assignShift } = useMutation({
    mutationFn: async () => {
      if (!selectedShift || !selectedEmployee) return;

      const { error } = await supabase
        .from('schedule_assignments')
        .upsert({
          shift_id: selectedShift,
          employee_id: selectedEmployee,
          date: format(date, 'yyyy-MM-dd'),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      onClose();
    },
  });

  const handleAssign = () => {
    assignShift();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Employee to Shift</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Shift</label>
            <Select value={selectedShift} onValueChange={setSelectedShift}>
              <SelectTrigger>
                <SelectValue placeholder="Select a shift" />
              </SelectTrigger>
              <SelectContent>
                {shifts?.map((shift) => (
                  <SelectItem key={shift.id} value={shift.id}>
                    {shift.name} ({format(new Date(`2000-01-01T${shift.start_time}`), 'h:mm a')} - 
                    {format(new Date(`2000-01-01T${shift.end_time}`), 'h:mm a')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Employee</label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!selectedShift || !selectedEmployee}>
            Assign
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 