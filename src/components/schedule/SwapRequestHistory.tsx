"use client"

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { ShiftSwapRequest } from '@/lib/scheduling/types';

interface SwapRequestHistoryProps {
  employeeId: string;
}

export function SwapRequestHistory({ employeeId }: SwapRequestHistoryProps) {
  const supabase = createClient();

  const { data: swapRequests, isLoading } = useQuery({
    queryKey: ['shift-swaps-history', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_swap_requests')
        .select(`
          *,
          from_assignment:shift_assignments(
            *,
            shift:shifts(*),
            employee:profiles(id, name)
          )
        `)
        .or(`to_employee_id.eq.${employeeId},from_assignment.employee_id.eq.${employeeId}`)
        .not('status', 'eq', 'pending')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as (ShiftSwapRequest & {
        from_assignment: {
          shift: {
            start_time: string;
            end_time: string;
            role: string;
          };
          employee: {
            id: string;
            name: string;
          };
        };
      })[];
    },
  });

  if (isLoading) {
    return <div>Loading swap request history...</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Swap Request History</CardTitle>
      </CardHeader>
      <CardContent>
        {swapRequests?.length ? (
          <div className="space-y-4">
            {swapRequests.map(request => (
              <div
                key={request.id}
                className="flex items-center justify-between bg-muted p-4 rounded"
              >
                <div>
                  <p className="font-medium">
                    {format(new Date(request.from_assignment.shift.start_time), 'EEEE, MMMM d')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(request.from_assignment.shift.start_time), 'h:mm a')} -{' '}
                    {format(new Date(request.from_assignment.shift.end_time), 'h:mm a')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {request.from_assignment.shift.role}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {request.from_assignment.employee.id === employeeId ? (
                      <>Requested by you</>
                    ) : (
                      <>From: {request.from_assignment.employee.name}</>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(request.updated_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <Badge className={getStatusColor(request.status)}>
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No swap request history</p>
        )}
      </CardContent>
    </Card>
  );
} 