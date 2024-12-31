// Daily coverage stats component - Displays staffing coverage statistics for each day

import { useMemo } from 'react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface DailyCoverageStatsProps {
  date: Date;
}

export default function DailyCoverageStats({ date }: DailyCoverageStatsProps) {
  const supabase = createClient();
  const formattedDate = format(date, 'yyyy-MM-dd');

  const { data: coverage, isLoading } = useQuery({
    queryKey: ['coverage', formattedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coverage_requirements')
        .select('*')
        .eq('date', formattedDate)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: assignments } = useQuery({
    queryKey: ['assignments', formattedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_assignments')
        .select('*')
        .eq('date', formattedDate);

      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    if (!coverage || !assignments) return null;

    return {
      required: coverage.required_staff,
      scheduled: assignments.length,
      difference: assignments.length - coverage.required_staff,
    };
  }, [coverage, assignments]);

  if (isLoading) return <div className="text-sm">Loading...</div>;

  return (
    <div className="mt-2 p-2 bg-gray-50 rounded-md">
      <div className="text-sm">
        <div className="flex justify-between">
          <span>Required:</span>
          <span>{stats?.required || 0}</span>
        </div>
        <div className="flex justify-between">
          <span>Scheduled:</span>
          <span>{stats?.scheduled || 0}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Difference:</span>
          <span className={stats?.difference && stats.difference < 0 ? 'text-red-500' : 'text-green-500'}>
            {stats?.difference || 0}
          </span>
        </div>
      </div>
    </div>
  );
} 