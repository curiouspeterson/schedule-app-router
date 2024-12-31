'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, addDays } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import WeekNavigation from './Calendar/WeekNavigation';
import DailyCoverageStats from './Calendar/DailyCoverageStats';
import DailySchedule from './DailySchedule';
import ScheduleControls from './ScheduleControls';

export default function ScheduleCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Start week on Monday
  const supabase = createClient();

  // Fetch the schedule for the selected week
  const { data: schedule } = useQuery({
    queryKey: ['schedule', format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('start_date', format(weekStart, 'yyyy-MM-dd'))
        .single();

      if (error) throw error;
      return data;
    },
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    return {
      date: day,
      dayName: format(day, 'EEEE'),
      dayNumber: format(day, 'd'),
    };
  });

  return (
    <div className="flex flex-col h-full">
      <WeekNavigation 
        selectedDate={selectedDate} 
        onDateChange={setSelectedDate} 
      />
      <div className="grid grid-cols-7 gap-4 mt-4">
        {weekDays.map((day) => (
          <div key={day.date.toISOString()} className="flex flex-col">
            <div className="text-sm font-medium">{day.dayName}</div>
            <div className="text-2xl">{day.dayNumber}</div>
            <DailyCoverageStats date={day.date} />
            <DailySchedule 
              date={day.date} 
              scheduleId={schedule?.id || ''}
            />
          </div>
        ))}
      </div>
      <ScheduleControls />
    </div>
  );
} 