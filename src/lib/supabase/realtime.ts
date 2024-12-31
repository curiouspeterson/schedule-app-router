import { createClient } from './client';
import { toast } from 'sonner';

interface AvailabilityPattern {
  id: string;
  employee_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface ShiftSwapRequest {
  id: string;
  from_assignment_id: string;
  to_employee_id: string;
  from_employee_id: string;
  status: 'pending' | 'approved' | 'rejected';
}

export function subscribeToAvailabilityUpdates() {
  const supabase = createClient();

  // Subscribe to availability pattern changes
  supabase
    .channel('availability-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'employee_availability',
      },
      async (payload) => {
        const { new: newRecord, old: oldRecord, eventType } = payload;

        if (!newRecord || typeof newRecord !== 'object') return;
        const record = newRecord as AvailabilityPattern;

        // Get employee name
        const { data: employee } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', record.employee_id)
          .single();

        if (!employee) return;

        // Show notification based on event type
        switch (eventType) {
          case 'INSERT':
            toast.success(`${employee.full_name} added new availability`);
            break;
          case 'UPDATE':
            toast.info(`${employee.full_name} updated their availability`);
            break;
          case 'DELETE':
            toast.info(`${employee.full_name} removed availability`);
            break;
        }
      }
    )
    .subscribe();
}

export function subscribeToShiftSwapRequests() {
  const supabase = createClient();

  // Subscribe to shift swap request changes
  supabase
    .channel('shift-swap-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'shift_swap_requests',
      },
      async (payload) => {
        const { new: newRecord, eventType } = payload;

        if (!newRecord || typeof newRecord !== 'object') return;
        const record = newRecord as ShiftSwapRequest;

        // Get employee names
        const { data: employees } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', [record.from_employee_id, record.to_employee_id]);

        if (!employees) return;

        const fromEmployee = employees.find(e => e.id === record.from_employee_id);
        const toEmployee = employees.find(e => e.id === record.to_employee_id);

        if (!fromEmployee || !toEmployee) return;

        // Show notification based on event type and status
        if (eventType === 'INSERT') {
          toast.info(
            `New shift swap request: ${fromEmployee.full_name} → ${toEmployee.full_name}`
          );
        } else if (eventType === 'UPDATE') {
          switch (record.status) {
            case 'approved':
              toast.success(
                `Shift swap approved: ${fromEmployee.full_name} → ${toEmployee.full_name}`
              );
              break;
            case 'rejected':
              toast.error(
                `Shift swap rejected: ${fromEmployee.full_name} → ${toEmployee.full_name}`
              );
              break;
          }
        }
      }
    )
    .subscribe();
} 