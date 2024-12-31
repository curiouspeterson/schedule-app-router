'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export function ShiftSwapRequestHistory() {
  const supabase = createClient();

  const { data: swapRequests, isLoading } = useQuery({
    queryKey: ['swapRequests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_swap_requests')
        .select(`
          *,
          from_assignment:schedule_assignments!from_assignment_id(
            *,
            shift:shifts(*),
            employee:profiles(*)
          ),
          to_employee:profiles!to_employee_id(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div>Loading swap requests...</div>;
  }

  if (!swapRequests?.length) {
    return <div>No swap requests found.</div>;
  }

  return (
    <div className="space-y-4">
      {swapRequests.map(request => (
        <div key={request.id} className="flex items-center justify-between bg-muted p-4 rounded">
          <div>
            <p className="font-medium">
              {request.from_assignment.employee.name} → {request.to_employee.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(request.from_assignment.shift.start_time), 'MMM d, h:mm a')}
            </p>
          </div>
          <Badge variant={getStatusVariant(request.status)}>
            {request.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function getStatusVariant(status: string): 'default' | 'destructive' | 'secondary' {
  switch (status) {
    case 'approved':
      return 'secondary';
    case 'rejected':
      return 'destructive';
    default:
      return 'default';
  }
} 