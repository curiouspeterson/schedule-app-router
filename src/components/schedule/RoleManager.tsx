"use client"

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface RoleManagerProps {
  organizationId: string;
}

export function RoleManager({ organizationId }: RoleManagerProps) {
  const [newRole, setNewRole] = useState('');
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('role')
        .eq('organization_id', organizationId)
        .order('role');

      if (error) throw error;
      // Get unique roles
      const uniqueRoles = Array.from(new Set(data.map(shift => shift.role)));
      return uniqueRoles;
    },
  });

  const addRole = useMutation({
    mutationFn: async (role: string) => {
      // Create a placeholder shift with the new role
      const { error } = await supabase
        .from('shifts')
        .insert([
          {
            organization_id: organizationId,
            role,
            start_time: new Date().toISOString(),
            end_time: new Date().toISOString(),
          },
        ]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role added successfully');
      setNewRole('');
    },
    onError: (error) => {
      toast.error('Failed to add role');
      console.error('Error adding role:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole.trim()) {
      toast.error('Please enter a role name');
      return;
    }
    addRole.mutate(newRole.trim());
  };

  if (isLoading) {
    return <div>Loading roles...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Management</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role">Add New Role</Label>
            <div className="flex gap-2">
              <Input
                id="role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="Enter role name"
              />
              <Button type="submit" disabled={addRole.isPending}>
                {addRole.isPending ? 'Adding...' : 'Add Role'}
              </Button>
            </div>
          </div>
        </form>

        <div className="mt-6">
          <h3 className="font-medium mb-2">Existing Roles</h3>
          <div className="grid gap-2">
            {roles?.map(role => (
              <div
                key={role}
                className="flex items-center justify-between bg-muted p-2 rounded"
              >
                <span>{role}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 