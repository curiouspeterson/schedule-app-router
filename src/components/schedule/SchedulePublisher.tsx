"use client"

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, addWeeks, startOfWeek } from 'date-fns';

interface SchedulePublisherProps {
  organizationId: string;
  weekStart: Date;
  version: number;
}

interface ScheduleVersion {
  id: string;
  status: 'draft' | 'review' | 'published';
  version: number;
  published_at: string | null;
  published_by: string | null;
}

interface ScheduleChange {
  id: string;
  change_type: 'added' | 'removed' | 'modified';
  previous_employee_id: string | null;
  new_employee_id: string | null;
  changed_by: string;
  created_at: string;
}

export function SchedulePublisher({
  organizationId,
  weekStart,
  version,
}: SchedulePublisherProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: scheduleVersion, isLoading: versionLoading } = useQuery({
    queryKey: ['schedule-version', organizationId, weekStart, version],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_versions')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('week_start', format(weekStart, 'yyyy-MM-dd'))
        .eq('version', version)
        .single();

      if (error) throw error;
      return data as ScheduleVersion;
    },
  });

  const { data: changes = [], isLoading: changesLoading } = useQuery({
    queryKey: ['schedule-changes', scheduleVersion?.id],
    queryFn: async () => {
      if (!scheduleVersion?.id) return [];

      const { data, error } = await supabase
        .from('schedule_changes')
        .select(`
          id,
          change_type,
          previous_employee_id,
          new_employee_id,
          changed_by,
          created_at,
          profiles!previous_employee_id (full_name),
          profiles!new_employee_id (full_name),
          profiles!changed_by (full_name)
        `)
        .eq('schedule_version_id', scheduleVersion.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ScheduleChange[];
    },
    enabled: !!scheduleVersion?.id,
  });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: 'draft' | 'review' | 'published') => {
      if (!scheduleVersion?.id) return;

      const updates: any = {
        status: newStatus,
      };

      if (newStatus === 'published') {
        const { data: { user } } = await supabase.auth.getUser();
        updates.published_at = new Date().toISOString();
        updates.published_by = user?.id;

        // Also update all related assignments
        const { error: assignmentsError } = await supabase
          .from('assignments')
          .update({
            publish_status: 'published',
            published_at: new Date().toISOString(),
            published_by: user?.id,
          })
          .eq('organization_id', organizationId)
          .eq('version', version);

        if (assignmentsError) throw assignmentsError;
      }

      const { error } = await supabase
        .from('schedule_versions')
        .update(updates)
        .eq('id', scheduleVersion.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['schedule-version', organizationId],
      });
      toast.success('Schedule status updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update schedule status');
      console.error('Error updating schedule status:', error);
    },
  });

  const handleStatusChange = async (newStatus: 'draft' | 'review' | 'published') => {
    try {
      setIsSubmitting(true);
      await updateStatus.mutateAsync(newStatus);
    } catch (error) {
      console.error('Error changing status:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (versionLoading) {
    return <div>Loading schedule version...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Schedule Publishing</CardTitle>
          <Badge variant={scheduleVersion?.status === 'published' ? 'secondary' : 'default'}>
            {scheduleVersion?.status || 'draft'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Week of {format(weekStart, 'MMM d, yyyy')}
              </p>
              <p className="text-sm text-muted-foreground">
                Version {version}
              </p>
            </div>
            <div className="space-x-2">
              {scheduleVersion?.status === 'draft' && (
                <Button
                  onClick={() => handleStatusChange('review')}
                  disabled={isSubmitting}
                >
                  Submit for Review
                </Button>
              )}
              {scheduleVersion?.status === 'review' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleStatusChange('draft')}
                    disabled={isSubmitting}
                  >
                    Return to Draft
                  </Button>
                  <Button
                    onClick={() => handleStatusChange('published')}
                    disabled={isSubmitting}
                  >
                    Publish Schedule
                  </Button>
                </>
              )}
            </div>
          </div>

          {scheduleVersion?.published_at && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm">
                Published on{' '}
                {format(new Date(scheduleVersion.published_at), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          )}

          {!changesLoading && changes.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium">Recent Changes</h3>
              <div className="space-y-2">
                {changes.map((change) => (
                  <div
                    key={change.id}
                    className="rounded-lg border p-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant={change.change_type === 'added' ? 'secondary' : 'default'}>
                        {change.change_type}
                      </Badge>
                      <span className="text-muted-foreground">
                        {format(new Date(change.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p className="mt-2">
                      {getChangeDescription(change)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getChangeDescription(change: ScheduleChange): string {
  switch (change.change_type) {
    case 'added':
      return `Added ${(change as any).profiles.new_employee_id.full_name} to the schedule`;
    case 'removed':
      return `Removed ${(change as any).profiles.previous_employee_id.full_name} from the schedule`;
    case 'modified':
      return `Changed assignment from ${(change as any).profiles.previous_employee_id.full_name} to ${(change as any).profiles.new_employee_id.full_name}`;
    default:
      return 'Unknown change';
  }
} 