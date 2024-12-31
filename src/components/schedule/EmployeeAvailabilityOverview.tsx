import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ChevronDown, Search, SortAsc, SortDesc } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { AvailabilitySummary } from './AvailabilitySummary';

interface Employee {
  id: string;
  email: string;
  full_name: string;
}

type SortField = 'name' | 'email';
type SortOrder = 'asc' | 'desc';

interface EmployeeAvailabilityOverviewProps {
  organizationId: string;
}

export function EmployeeAvailabilityOverview({ organizationId }: EmployeeAvailabilityOverviewProps) {
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const supabase = createClient();

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('organization_id', organizationId)
        .order('full_name');

      if (error) throw error;
      return data as Employee[];
    },
  });

  const toggleEmployee = (employeeId: string) => {
    setExpandedEmployees(current => {
      const updated = new Set(current);
      if (updated.has(employeeId)) {
        updated.delete(employeeId);
      } else {
        updated.add(employeeId);
      }
      return updated;
    });
  };

  const toggleSortOrder = () => {
    setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
  };

  const filteredAndSortedEmployees = employees
    ?.filter(employee => {
      const searchLower = searchQuery.toLowerCase();
      return (
        employee.full_name.toLowerCase().includes(searchLower) ||
        employee.email.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      const fieldA = sortField === 'name' ? a.full_name : a.email;
      const fieldB = sortField === 'name' ? b.full_name : b.email;
      const comparison = fieldA.localeCompare(fieldB);
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading employees...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AvailabilitySummary organizationId={organizationId} />
      
      <Card>
        <CardHeader>
          <CardTitle>Employee Availability Overview</CardTitle>
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={sortField}
              onValueChange={(value: SortField) => setSortField(value)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort by Name</SelectItem>
                <SelectItem value="email">Sort by Email</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSortOrder}
            >
              {sortOrder === 'asc' ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredAndSortedEmployees?.map(employee => (
            <Collapsible
              key={employee.id}
              open={expandedEmployees.has(employee.id)}
              onOpenChange={() => toggleEmployee(employee.id)}
            >
              <Card>
                <CardHeader className="p-4">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <span className="font-medium">{employee.full_name}</span>
                        <span className="ml-2 text-sm text-muted-foreground">
                          {employee.email}
                        </span>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          expandedEmployees.has(employee.id) ? 'transform rotate-180' : ''
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <AvailabilityCalendar employeeId={employee.id} />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </CardContent>
      </Card>
    </div>
  );
} 