import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { format, startOfWeek, addDays, parse } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface AvailabilityPattern {
  id: string;
  employee_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface AvailabilityCalendarProps {
  employeeId: string;
}

export function AvailabilityCalendar({ employeeId }: AvailabilityCalendarProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const supabase = createClient();

  const { data: patterns, isLoading } = useQuery({
    queryKey: ['availability-patterns', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('availability_patterns')
        .select('*')
        .eq('employee_id', employeeId)
        .order('day_of_week');

      if (error) throw error;
      return data as AvailabilityPattern[];
    },
  });

  const timeSlots = Array.from({ length: 24 }, (_, i) => 
    format(new Date().setHours(i, 0), 'HH:mm')
  );

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const isTimeInRange = (time: string, dayIndex: number) => {
    const pattern = patterns?.find(p => p.day_of_week === dayIndex);
    if (!pattern || !pattern.start_time || !pattern.end_time) return false;

    const timeDate = parse(time, 'HH:mm', new Date());
    const startDate = parse(pattern.start_time, 'HH:mm', new Date());
    const endDate = parse(pattern.end_time, 'HH:mm', new Date());

    return timeDate >= startDate && timeDate <= endDate;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setWeekStart(current => 
      direction === 'prev' 
        ? addDays(current, -7) 
        : addDays(current, 7)
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading calendar...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Availability Calendar</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium">
            {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-[auto,repeat(7,1fr)] gap-1">
          {/* Time labels */}
          <div className="sticky left-0 bg-background">
            <div className="h-10" /> {/* Header spacer */}
            {timeSlots.map(time => (
              <div
                key={time}
                className="h-8 pr-2 text-right text-sm text-muted-foreground"
              >
                {time}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIndex) => (
            <div key={day.toString()} className="min-w-[100px]">
              {/* Day header */}
              <div className="h-10 text-center border-b">
                <div className="font-medium">{format(day, 'EEE')}</div>
                <div className="text-sm text-muted-foreground">
                  {format(day, 'MMM d')}
                </div>
              </div>

              {/* Time slots */}
              {timeSlots.map(time => (
                <div
                  key={time}
                  className={`h-8 border-b border-r ${
                    isTimeInRange(time, dayIndex)
                      ? 'bg-primary/20'
                      : 'bg-background'
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 