"use client"

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AvailabilityManager } from './AvailabilityManager';
import { PreferenceManager } from './PreferenceManager';

interface SchedulePreferencesPanelProps {
  employeeId: string;
}

export function SchedulePreferencesPanel({ employeeId }: SchedulePreferencesPanelProps) {
  const [activeTab, setActiveTab] = useState('availability');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Preferences</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="availability">Availability</TabsTrigger>
            <TabsTrigger value="preferences">Shift Preferences</TabsTrigger>
          </TabsList>
          <TabsContent value="availability" className="mt-4">
            <AvailabilityManager employeeId={employeeId} />
          </TabsContent>
          <TabsContent value="preferences" className="mt-4">
            <PreferenceManager employeeId={employeeId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 