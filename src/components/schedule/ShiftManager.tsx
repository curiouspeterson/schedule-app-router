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
import { toast } from 'sonner';
import { useState } from 'react';

interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  role: string;
  required_staff: number;
}

export function ShiftManager() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [shiftName, setShiftName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [role, setRole] = useState('employee');
  const [requiredStaff, setRequiredStaff] = useState('1');

  // Fetch shifts
  const { data: shifts, isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('start_time');

      if (error) throw error;
      return data as Shift[];
    },
  });

  // Mutation for creating/updating shifts
  const upsertShift = useMutation({
    mutationFn: async (shift: Partial<Shift>) => {
      const { error } = await supabase
        .from('shifts')
        .upsert(shift)
        .select()
        .single();

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success(
        selectedShift ? 'Shift updated successfully' : 'Shift created successfully'
      );
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(
        selectedShift ? 'Failed to update shift' : 'Failed to create shift'
      );
      console.error('Error upserting shift:', error);
    },
  });

  // Mutation for deleting shifts
  const deleteShift = useMutation({
    mutationFn: async (shiftId: string) => {
      const { error } = await supabase.from('shifts').delete().eq('id', shiftId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('Shift deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete shift');
      console.error('Error deleting shift:', error);
    },
  });

  const handleOpenDialog = (shift?: Shift) => {
    if (shift) {
      setSelectedShift(shift);
      setShiftName(shift.name);
      setStartTime(shift.start_time);
      setEndTime(shift.end_time);
      setRole(shift.role);
      setRequiredStaff(shift.required_staff.toString());
    } else {
      setSelectedShift(null);
      setShiftName('');
      setStartTime('09:00');
      setEndTime('17:00');
      setRole('employee');
      setRequiredStaff('1');
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedShift(null);
    setShiftName('');
    setStartTime('09:00');
    setEndTime('17:00');
    setRole('employee');
    setRequiredStaff('1');
  };

  const handleSubmit = () => {
    const shift = {
      ...(selectedShift?.id ? { id: selectedShift.id } : {}),
      name: shiftName,
      start_time: startTime,
      end_time: endTime,
      role,
      required_staff: parseInt(requiredStaff),
    };

    upsertShift.mutate(shift);
  };

  if (isLoading) {
    return <div>Loading shifts...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Shift Templates</h2>
        <Button onClick={() => handleOpenDialog()}>Create New Shift</Button>
      </div>

      <div className="space-y-4">
        {shifts?.map((shift) => (
          <div
            key={shift.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div>
              <p className="font-medium">{shift.name}</p>
              <p className="text-sm text-muted-foreground">
                {shift.start_time} - {shift.end_time}
              </p>
              <p className="text-sm">
                {shift.role} • {shift.required_staff} staff required
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenDialog(shift)}
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this shift?')) {
                    deleteShift.mutate(shift.id);
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedShift ? 'Edit Shift' : 'Create New Shift'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Shift Name</label>
              <input
                type="text"
                className="w-full rounded-md border px-3 py-2"
                value={shiftName}
                onChange={(e) => setShiftName(e.target.value)}
                placeholder="e.g., Morning Shift"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Time</label>
                <input
                  type="time"
                  className="w-full rounded-md border px-3 py-2"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Time</label>
                <input
                  type="time"
                  className="w-full rounded-md border px-3 py-2"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role Required</label>
              <input
                type="text"
                className="w-full rounded-md border px-3 py-2"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g., employee"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Required Staff</label>
              <input
                type="number"
                className="w-full rounded-md border px-3 py-2"
                min="1"
                value={requiredStaff}
                onChange={(e) => setRequiredStaff(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {selectedShift ? 'Save Changes' : 'Create Shift'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 