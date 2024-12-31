import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useState } from 'react';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  weekly_hours_limit: number;
}

export function EmployeeManager() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editedHours, setEditedHours] = useState('');
  const [editedRole, setEditedRole] = useState('');

  // Fetch employees
  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Employee[];
    },
  });

  // Mutation for updating employee details
  const updateEmployee = useMutation({
    mutationFn: async ({
      employeeId,
      updates,
    }: {
      employeeId: string;
      updates: Partial<Employee>;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', employeeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee updated successfully');
      setIsDialogOpen(false);
      setSelectedEmployee(null);
      setEditedHours('');
      setEditedRole('');
    },
    onError: (error) => {
      toast.error('Failed to update employee');
      console.error('Error updating employee:', error);
    },
  });

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEditedHours(employee.weekly_hours_limit.toString());
    setEditedRole(employee.role);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!selectedEmployee) return;

    const updates: Partial<Employee> = {};
    if (editedHours && parseInt(editedHours) !== selectedEmployee.weekly_hours_limit) {
      updates.weekly_hours_limit = parseInt(editedHours);
    }
    if (editedRole && editedRole !== selectedEmployee.role) {
      updates.role = editedRole;
    }

    if (Object.keys(updates).length > 0) {
      updateEmployee.mutate({
        employeeId: selectedEmployee.id,
        updates,
      });
    } else {
      setIsDialogOpen(false);
    }
  };

  if (isLoading) {
    return <div>Loading employees...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Employee Management</h2>
      <div className="space-y-4">
        {employees?.map((employee) => (
          <div
            key={employee.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div>
              <p className="font-medium">{employee.name}</p>
              <p className="text-sm text-muted-foreground">{employee.email}</p>
              <p className="text-sm">
                {employee.role} • {employee.weekly_hours_limit} hours/week
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEditEmployee(employee)}
            >
              Edit
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedEmployee && (
              <>
                <div>
                  <p className="font-medium">{selectedEmployee.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedEmployee.email}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Weekly Hours Limit</label>
                  <input
                    type="number"
                    className="w-full rounded-md border px-3 py-2"
                    min="0"
                    max="168"
                    value={editedHours}
                    onChange={(e) => setEditedHours(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <Select value={editedRole} onValueChange={setEditedRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>Save Changes</Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 