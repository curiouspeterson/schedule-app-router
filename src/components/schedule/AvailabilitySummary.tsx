import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface AvailabilitySummaryProps {
  organizationId: string;
}

interface AvailabilityStats {
  totalEmployees: number;
  fullyAvailable: number;
  partiallyAvailable: number;
  unavailable: number;
  averageHoursPerWeek: number;
  mostAvailableDay: string;
  leastAvailableDay: string;
}

const daysOfWeek = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function AvailabilitySummary({ organizationId }: AvailabilitySummaryProps) {
  const supabase = createClient();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['availability-stats', organizationId],
    queryFn: async () => {
      // Get all employees in the organization
      const { data: employees, error: employeesError } = await supabase
        .from('profiles')
        .select('id')
        .eq('organization_id', organizationId);

      if (employeesError) throw employeesError;

      // Get availability patterns for all employees
      const { data: patterns, error: patternsError } = await supabase
        .from('availability_patterns')
        .select('*')
        .in('employee_id', employees.map(e => e.id));

      if (patternsError) throw patternsError;

      // Calculate statistics
      const employeeAvailability = new Map<string, number[]>();
      const dayAvailability = new Array(7).fill(0);

      // Initialize employee availability map
      employees.forEach(employee => {
        employeeAvailability.set(employee.id, new Array(7).fill(0));
      });

      // Process patterns
      patterns.forEach(pattern => {
        const hours = calculateHours(pattern.start_time, pattern.end_time);
        const employeeHours = employeeAvailability.get(pattern.employee_id);
        if (employeeHours) {
          employeeHours[pattern.day_of_week] = hours;
        }
        dayAvailability[pattern.day_of_week] += hours;
      });

      // Calculate summary statistics
      const totalEmployees = employees.length;
      let fullyAvailable = 0;
      let partiallyAvailable = 0;
      let unavailable = 0;
      let totalHours = 0;

      employeeAvailability.forEach(hours => {
        const weeklyHours = hours.reduce((sum, h) => sum + h, 0);
        totalHours += weeklyHours;

        if (weeklyHours >= 40) {
          fullyAvailable++;
        } else if (weeklyHours > 0) {
          partiallyAvailable++;
        } else {
          unavailable++;
        }
      });

      // Find most and least available days
      const mostAvailableIndex = dayAvailability.indexOf(Math.max(...dayAvailability));
      const leastAvailableIndex = dayAvailability.indexOf(Math.min(...dayAvailability));

      return {
        totalEmployees,
        fullyAvailable,
        partiallyAvailable,
        unavailable,
        averageHoursPerWeek: totalHours / totalEmployees,
        mostAvailableDay: daysOfWeek[mostAvailableIndex],
        leastAvailableDay: daysOfWeek[leastAvailableIndex],
      } as AvailabilityStats;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading availability statistics...</span>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Employee Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalEmployees}</div>
          <p className="text-xs text-muted-foreground">
            Total Employees
          </p>
          <div className="mt-4 space-y-2">
            <div className="text-sm">
              Fully Available: {stats.fullyAvailable}
            </div>
            <div className="text-sm">
              Partially Available: {stats.partiallyAvailable}
            </div>
            <div className="text-sm">
              Unavailable: {stats.unavailable}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Average Weekly Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.averageHoursPerWeek.toFixed(1)}
          </div>
          <p className="text-xs text-muted-foreground">
            Hours per employee
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Most Available Day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.mostAvailableDay}</div>
          <p className="text-xs text-muted-foreground">
            Highest employee availability
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Least Available Day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.leastAvailableDay}</div>
          <p className="text-xs text-muted-foreground">
            Lowest employee availability
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function calculateHours(startTime: string, endTime: string): number {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const start = startHour + startMinute / 60;
  const end = endHour + endMinute / 60;
  
  return end - start;
} 