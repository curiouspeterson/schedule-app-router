"use client"

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

interface ScheduleFiltersProps {
  organizationId: string;
  onFilterChange: (filters: {
    employeeId?: string;
    role?: string;
    searchQuery?: string;
  }) => void;
}

export function ScheduleFilters({ organizationId, onFilterChange }: ScheduleFiltersProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const supabase = createClient();

  const { data: employees } = useQuery({
    queryKey: ['employees', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const { data: roles } = useQuery({
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

  const handleEmployeeChange = (value: string) => {
    setSelectedEmployee(value);
    onFilterChange({
      employeeId: value || undefined,
      role: selectedRole || undefined,
      searchQuery: searchQuery || undefined,
    });
  };

  const handleRoleChange = (value: string) => {
    setSelectedRole(value);
    onFilterChange({
      employeeId: selectedEmployee || undefined,
      role: value || undefined,
      searchQuery: searchQuery || undefined,
    });
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onFilterChange({
      employeeId: selectedEmployee || undefined,
      role: selectedRole || undefined,
      searchQuery: value || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Employee</Label>
          <Select
            value={selectedEmployee}
            onValueChange={handleEmployeeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="All employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All employees</SelectItem>
              {employees?.map(employee => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Role</Label>
          <Select
            value={selectedRole}
            onValueChange={handleRoleChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All roles</SelectItem>
              {roles?.map(role => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Search</Label>
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
} 