export interface Employee {
  id: string;
  name: string;
  email: string;
  organization_id: string;
  is_manager: boolean;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  organization_id: string;
  role: string;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
}

export type AssignmentStatus = 'assigned' | 'pending' | 'rejected';

export interface ShiftAssignment {
  id: string;
  shift_id: string;
  employee_id: string;
  status: AssignmentStatus;
  created_at: string;
  updated_at: string;
  shift?: Shift;
}

export interface ShiftSwapRequest {
  id: string;
  from_assignment_id: string;
  to_employee_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface SwapValidationResult {
  isValid: boolean;
  message?: string;
}

export interface Availability {
  id: string;
  employee_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface CoverageRequirement {
  id: string;
  shift_id: string;
  day_of_week: number;
  required_staff: number;
}

export interface SchedulingConstraints {
  maxHoursPerDay: number;
  minHoursBetweenShifts: number;
  maxConsecutiveDays: number;
}

export interface SchedulingResult {
  assignments: ShiftAssignment[];
  unassignedShifts: Shift[];
  employeeStats: Record<string, {
    totalHours: number;
    consecutiveDays: number;
  }>;
} 