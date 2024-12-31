'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Calendar, UserCog } from 'lucide-react';

interface Employee {
  id: string;
  full_name: string;
  email: string;
  role: 'manager' | 'employee';
  weekly_hours_limit: number;
}

export function EmployeeList() {
  const supabase = createClient();

  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-lg text-muted-foreground">Loading employees...</p>
      </div>
    );
  }

  if (!employees?.length) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-lg text-muted-foreground">No employees found</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {employees.map((employee) => (
        <Card key={employee.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{employee.full_name}</span>
              <Badge variant={employee.role === 'manager' ? 'default' : 'secondary'}>
                {employee.role}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center text-sm text-muted-foreground">
                <Mail className="mr-2 h-4 w-4" />
                {employee.email}
              </div>
              <div className="text-sm text-muted-foreground">
                Weekly Hours: {employee.weekly_hours_limit}
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center"
                >
                  <UserCog className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 