'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail } from 'lucide-react';

interface EmployeeListProps {
  organizationId: string;
}

export function EmployeeList({ organizationId }: EmployeeListProps) {
  const supabase = createClient();

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', organizationId)
        .order('full_name');

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div>Loading employees...</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {employees?.map((employee) => (
        <Card key={employee.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{employee.full_name}</span>
              {employee.is_manager && (
                <Badge variant="secondary">Manager</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center text-sm text-muted-foreground">
                <Mail className="mr-2 h-4 w-4" />
                {employee.email}
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">View Schedule</Button>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 