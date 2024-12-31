"use client"

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface DashboardMetrics {
  totalShifts: number;
  upcomingShifts: number;
  pendingTimeOff: number;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalShifts: 0,
    upcomingShifts: 0,
    pendingTimeOff: 0,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      const supabase = createClient();
      
      // Fetch metrics from Supabase
      // TODO: Implement actual metrics queries
      
      setMetrics({
        totalShifts: 0,
        upcomingShifts: 0,
        pendingTimeOff: 0,
      });
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-4 bg-card rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold">Total Shifts</h3>
          <p className="text-3xl font-bold">{metrics.totalShifts}</p>
        </div>
        <div className="p-4 bg-card rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold">Upcoming Shifts</h3>
          <p className="text-3xl font-bold">{metrics.upcomingShifts}</p>
        </div>
        <div className="p-4 bg-card rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold">Pending Time Off</h3>
          <p className="text-3xl font-bold">{metrics.pendingTimeOff}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Add more dashboard widgets here */}
      </div>
    </div>
  );
} 