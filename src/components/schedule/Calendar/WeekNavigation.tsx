// Week navigation component - Controls for navigating between weeks in the schedule calendar

import { Button } from '@/components/ui/button';
import { addWeeks, subWeeks, format } from 'date-fns';

interface WeekNavigationProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export default function WeekNavigation({ selectedDate, onDateChange }: WeekNavigationProps) {
  const handlePreviousWeek = () => {
    onDateChange(subWeeks(selectedDate, 1));
  };

  const handleNextWeek = () => {
    onDateChange(addWeeks(selectedDate, 1));
  };

  const handleCurrentWeek = () => {
    onDateChange(new Date());
  };

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-4">
        <Button variant="outline" onClick={handlePreviousWeek}>
          Previous Week
        </Button>
        <Button variant="outline" onClick={handleCurrentWeek}>
          Current Week
        </Button>
        <Button variant="outline" onClick={handleNextWeek}>
          Next Week
        </Button>
      </div>
      <div className="text-lg font-semibold">
        Week of {format(selectedDate, 'MMMM d, yyyy')}
      </div>
    </div>
  );
} 