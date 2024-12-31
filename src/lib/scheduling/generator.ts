import { ShiftAssignment, Employee, Shift } from './types';
import { isEmployeeAvailable, checkConstraints } from './utils';
import { ShiftPreference, calculatePreferenceScore, getEmployeeConstraints } from './preferences';

interface GeneratorOptions {
  employees: Employee[];
  shifts: Shift[];
  preferences: ShiftPreference[];
  startDate: Date;
  endDate: Date;
}

interface GeneratorResult {
  assignments: ShiftAssignment[];
  unassignedShifts: Shift[];
  stats: {
    totalShifts: number;
    assignedShifts: number;
    preferenceScore: number;
    employeeHours: Record<string, number>;
  };
}

export function generateSchedule(options: GeneratorOptions): GeneratorResult {
  const { employees, shifts, preferences, startDate, endDate } = options;
  const assignments: ShiftAssignment[] = [];
  const unassignedShifts: Shift[] = [];
  const employeeHours: Record<string, number> = {};
  let totalPreferenceScore = 0;

  // Initialize employee hours
  employees.forEach(emp => {
    employeeHours[emp.id] = 0;
  });

  // Sort shifts by date and time
  const sortedShifts = [...shifts].sort((a, b) => {
    const dateA = new Date(a.start_time);
    const dateB = new Date(b.start_time);
    return dateA.getTime() - dateB.getTime();
  });

  // Process each shift
  sortedShifts.forEach(shift => {
    const shiftDate = new Date(shift.start_time);
    const dayOfWeek = shiftDate.getDay();
    
    // Get available employees for this shift
    const availableEmployees = employees.filter(emp => {
      // Check basic availability
      if (!isEmployeeAvailable(emp, shift, assignments)) return false;

      // Get employee constraints from preferences
      const constraints = getEmployeeConstraints(preferences, emp.id);

      // Check constraints including current assignments
      const currentAssignments = assignments.filter(a => a.employee_id === emp.id);
      return checkConstraints(emp, shift, currentAssignments, constraints);
    });

    if (availableEmployees.length === 0) {
      unassignedShifts.push(shift);
      return;
    }

    // Calculate preference scores for available employees
    const scoredEmployees = availableEmployees.map(emp => {
      const shiftType = getShiftType(shift);
      const preferenceScore = calculatePreferenceScore(
        preferences,
        shiftType,
        dayOfWeek
      );

      // Factor in workload balance
      const hoursWorked = employeeHours[emp.id] || 0;
      const workloadScore = 1 - (hoursWorked / 40); // Favor employees with fewer hours

      return {
        employee: emp,
        score: preferenceScore * workloadScore,
      };
    });

    // Sort by score (highest first)
    scoredEmployees.sort((a, b) => b.score - a.score);

    // Assign shift to highest scoring employee
    const bestMatch = scoredEmployees[0];
    const assignment: ShiftAssignment = {
      id: `${shift.id}-${bestMatch.employee.id}`,
      shift_id: shift.id,
      employee_id: bestMatch.employee.id,
      status: 'assigned',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    assignments.push(assignment);
    totalPreferenceScore += bestMatch.score;

    // Update employee hours
    const shiftHours = getShiftHours(shift);
    employeeHours[bestMatch.employee.id] = (employeeHours[bestMatch.employee.id] || 0) + shiftHours;
  });

  return {
    assignments,
    unassignedShifts,
    stats: {
      totalShifts: shifts.length,
      assignedShifts: assignments.length,
      preferenceScore: totalPreferenceScore / assignments.length,
      employeeHours,
    },
  };
}

function getShiftType(shift: Shift): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date(shift.start_time).getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function getShiftHours(shift: Shift): number {
  const start = new Date(shift.start_time);
  const end = new Date(shift.end_time);
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
} 