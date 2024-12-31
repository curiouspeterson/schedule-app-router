// Schedule calendar component - Main calendar view for displaying and managing schedules

import { useState } from 'react';
import WeekNavigation from './Calendar/WeekNavigation';
import DailyCoverageStats from './Calendar/DailyCoverageStats';
import DailySchedule from './DailySchedule';
import ScheduleControls from './ScheduleControls';
import { format, startOfWeek, addDays } from 'date-fns';

export default function ScheduleCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Start week on Monday

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
            <DailySchedule date={day.date} />
          </div>
        ))}
      </div>
      <ScheduleControls />
    </div>
  );
} 