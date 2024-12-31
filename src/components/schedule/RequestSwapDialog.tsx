"use client"

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Employee } from '@/lib/scheduling/types';

interface RequestSwapDialogProps {
  assignmentId: string;
  shiftDate: Date;
  shiftTime: string;
  shiftRole: string;
}

export function RequestSwapDialog({
  assignmentId,
  shiftDate,
  shiftTime,
  shiftRole,
}: RequestSwapDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const supabase = createClient();
  const queryClient = useQueryClient();

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
  });

  const createSwapRequest = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('shift_swap_requests')
        .insert([
          {
            from_assignment_id: assignmentId,
            to_employee_id: selectedEmployeeId,
            status: 'pending',
          },
        ]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-swaps'] });
      toast.success('Swap request sent successfully');
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to send swap request');
      console.error('Error creating swap request:', error);
    },
  });

  const handleRequestSwap = () => {
    if (!selectedEmployeeId) {
      toast.error('Please select an employee');
      return;
    }

    createSwapRequest.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Request Swap
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Shift Swap</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h3 className="font-medium">Shift Details</h3>
            <p className="text-sm text-muted-foreground">
              {format(shiftDate, 'EEEE, MMMM d')}
            </p>
            <p className="text-sm text-muted-foreground">{shiftTime}</p>
            <p className="text-sm text-muted-foreground">{shiftRole}</p>
          </div>
          <div className="space-y-2">
            <Label>Select Employee</Label>
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an employee" />
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
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestSwap}
              disabled={!selectedEmployeeId || createSwapRequest.isPending}
            >
              {createSwapRequest.isPending ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 