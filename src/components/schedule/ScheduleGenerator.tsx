"use client"

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { generateSchedule } from '@/lib/scheduling/algorithm';
import { startOfWeek, addWeeks, format } from 'date-fns';
import { SchedulePublisher } from './SchedulePublisher';

interface ScheduleGeneratorProps {
  organizationId: string;
}

interface Assignment {
  shift_id: string;
  employee_id: string;
  score: number;
}

interface ScheduleVersion {
  id: string;
  version: number;
  status: 'draft' | 'review' | 'published';
}

export function ScheduleGenerator({ organizationId }: ScheduleGeneratorProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [selectedWeek, setSelectedWeek] = useState(() => startOfWeek(new Date()));
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: scheduleVersion, isLoading: versionLoading } = useQuery({
    queryKey: ['schedule-version', organizationId, format(selectedWeek, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_versions')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('week_start', format(selectedWeek, 'yyyy-MM-dd'))
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as ScheduleVersion | null;
    },
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['assignments', organizationId, scheduleVersion?.id],
    queryFn: async () => {
      if (!scheduleVersion?.id) return [];

      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          profiles!employee_id (full_name),
          shifts!shift_id (role, start_time, end_time)
        `)
        .eq('organization_id', organizationId)
        .eq('version', scheduleVersion.version);

      if (error) throw error;
      return data;
    },
    enabled: !!scheduleVersion?.id,
  });

  const createScheduleVersion = useMutation({
    mutationFn: async () => {
      const newVersion = (scheduleVersion?.version || 0) + 1;
      const { data, error } = await supabase
        .from('schedule_versions')
        .insert({
          organization_id: organizationId,
          week_start: format(selectedWeek, 'yyyy-MM-dd'),
          version: newVersion,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['schedule-version', organizationId],
      });
    },
  });

  const saveAssignments = useMutation({
    mutationFn: async (newAssignments: Assignment[]) => {
      const version = await createScheduleVersion.mutateAsync();
      const { data: { user } } = await supabase.auth.getUser();

      // Insert new assignments
      const { error: insertError } = await supabase
        .from('assignments')
        .insert(
          newAssignments.map((assignment) => ({
            ...assignment,
            organization_id: organizationId,
            version: version.version,
            publish_status: 'draft',
          }))
        );

      if (insertError) throw insertError;

      // Record changes
      const changes = newAssignments.map((assignment) => ({
        schedule_version_id: version.id,
        assignment_id: assignment.shift_id,
        change_type: 'added',
        new_employee_id: assignment.employee_id,
        changed_by: user?.id,
      }));

      const { error: changesError } = await supabase
        .from('schedule_changes')
        .insert(changes);

      if (changesError) throw changesError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['assignments', organizationId],
      });
      toast.success('Schedule generated and saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save schedule');
      console.error('Error saving schedule:', error);
    },
  });

  const handleGenerateSchedule = async () => {
    try {
      setIsGenerating(true);
      const newAssignments = await generateSchedule(organizationId, selectedWeek);
      await saveAssignments.mutateAsync(newAssignments);
    } catch (error) {
      toast.error('Failed to generate schedule');
      console.error('Error generating schedule:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleWeekChange = (offset: number) => {
    setSelectedWeek((current) => addWeeks(current, offset));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Schedule Generator</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleWeekChange(-1)}
                disabled={isGenerating}
              >
                Previous Week
              </Button>
              <span className="font-medium">
                Week of {format(selectedWeek, 'MMM d, yyyy')}
              </span>
              <Button
                variant="outline"
                onClick={() => handleWeekChange(1)}
                disabled={isGenerating}
              >
                Next Week
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={handleGenerateSchedule}
                disabled={isGenerating || scheduleVersion?.status === 'published'}
              >
                {isGenerating ? 'Generating...' : 'Generate Schedule'}
              </Button>
            </div>

            {assignmentsLoading ? (
              <div>Loading assignments...</div>
            ) : assignments?.length ? (
              <div className="space-y-4">
                <h3 className="font-medium">Generated Assignments</h3>
                <div className="grid gap-2">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">
                          {assignment.profiles.full_name} - {assignment.shifts.role}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(assignment.shifts.start_time), 'h:mm a')} -{' '}
                          {format(new Date(assignment.shifts.end_time), 'h:mm a')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Score: {assignment.score}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground">
                No assignments generated for this week yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {scheduleVersion && (
        <SchedulePublisher
          organizationId={organizationId}
          weekStart={selectedWeek}
          version={scheduleVersion.version}
        />
      )}
    </div>
  );
} 