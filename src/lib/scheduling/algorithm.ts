import { addDays, format, parse, startOfWeek } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import {
  validateShiftAgainstAvailability,
  validateShiftOverlap,
} from './validation';

interface Employee {
  id: string;
  full_name: string;
  organization_id: string;
}

interface TimeSlot {
  start_time: string;
  end_time: string;
}

interface Availability extends TimeSlot {
  day: string;
  employee_id: string;
}

interface ShiftPreference {
  day: string;
  time_range: string;
  preference_type: 'preferred' | 'neutral' | 'avoid';
  employee_id: string;
}

interface Constraints {
  max_weekly_hours: number;
  max_consecutive_days: number;
  employee_id: string;
}

interface Shift extends TimeSlot {
  id: string;
  role: string;
  day: string;
}

interface Assignment {
  shift_id: string;
  employee_id: string;
  score: number;
}

const TIME_RANGE_HOURS = {
  'Morning (6:00 - 12:00)': { start: '06:00', end: '12:00' },
  'Afternoon (12:00 - 18:00)': { start: '12:00', end: '18:00' },
  'Evening (18:00 - 24:00)': { start: '18:00', end: '24:00' },
};

export async function generateSchedule(
  organizationId: string,
  weekStart: Date
): Promise<Assignment[]> {
  const supabase = createClient();
  const assignments: Assignment[] = [];

  // Fetch all required data
  const { data: employees } = await supabase
    .from('profiles')
    .select('id, full_name, organization_id')
    .eq('organization_id', organizationId);

  const { data: shifts } = await supabase
    .from('shifts')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('start_time', format(weekStart, 'yyyy-MM-dd'))
    .lt('start_time', format(addDays(weekStart, 7), 'yyyy-MM-dd'));

  const { data: availability } = await supabase
    .from('availability')
    .select('*')
    .in(
      'employee_id',
      employees?.map((e) => e.id) || []
    );

  const { data: preferences } = await supabase
    .from('shift_preferences')
    .select('*')
    .in(
      'employee_id',
      employees?.map((e) => e.id) || []
    );

  const { data: constraints } = await supabase
    .from('employee_constraints')
    .select('*')
    .in(
      'employee_id',
      employees?.map((e) => e.id) || []
    );

  if (!employees || !shifts || !availability || !preferences || !constraints) {
    throw new Error('Failed to fetch required data');
  }

  // Process each shift
  for (const shift of shifts) {
    const shiftDay = format(new Date(shift.start_time), 'EEEE');
    const candidates = employees
      .map((employee) => {
        // Check availability
        const employeeAvailability = availability.filter(
          (a) => a.employee_id === employee.id && a.day === shiftDay
        );
        const isAvailable = employeeAvailability.some((a) =>
          validateShiftAgainstAvailability(shift, a)
        );
        if (!isAvailable) return null;

        // Check existing assignments for overlaps
        const existingShifts = shifts.filter((s) =>
          assignments.some(
            (a) => a.shift_id === s.id && a.employee_id === employee.id
          )
        );
        if (!validateShiftOverlap(shift, existingShifts)) return null;

        // Calculate preference score
        const timeRange = getTimeRange(shift);
        const preference = preferences.find(
          (p) =>
            p.employee_id === employee.id &&
            p.day === shiftDay &&
            p.time_range === timeRange
        );
        const preferenceScore = getPreferenceScore(preference?.preference_type);

        // Check constraints
        const employeeConstraints = constraints.find(
          (c) => c.employee_id === employee.id
        );
        if (!validateConstraints(employee.id, shift, employeeConstraints, assignments, shifts)) {
          return null;
        }

        return {
          employee_id: employee.id,
          score: preferenceScore,
        };
      })
      .filter((c): c is { employee_id: string; score: number } => c !== null);

    // Assign shift to best candidate
    if (candidates.length > 0) {
      const bestCandidate = candidates.reduce((best, current) =>
        current.score > best.score ? current : best
      );

      assignments.push({
        shift_id: shift.id,
        employee_id: bestCandidate.employee_id,
        score: bestCandidate.score,
      });
    }
  }

  return assignments;
}

function getTimeRange(shift: Shift): string {
  const shiftStart = format(new Date(shift.start_time), 'HH:mm');
  
  for (const [range, hours] of Object.entries(TIME_RANGE_HOURS)) {
    if (shiftStart >= hours.start && shiftStart < hours.end) {
      return range;
    }
  }
  
  return 'Morning (6:00 - 12:00)'; // Default to morning if no match
}

function getPreferenceScore(preferenceType?: 'preferred' | 'neutral' | 'avoid'): number {
  switch (preferenceType) {
    case 'preferred':
      return 2;
    case 'avoid':
      return 0;
    case 'neutral':
    default:
      return 1;
  }
}

function validateConstraints(
  employeeId: string,
  shift: Shift,
  constraints: Constraints | undefined,
  existingAssignments: Assignment[],
  allShifts: Shift[]
): boolean {
  if (!constraints) return true;

  // Check weekly hours
  const weeklyHours = calculateWeeklyHours(employeeId, shift, existingAssignments, allShifts);
  const shiftHours = calculateShiftHours(shift);
  if (weeklyHours + shiftHours > constraints.max_weekly_hours) {
    return false;
  }

  // Check consecutive days
  const consecutiveDays = calculateConsecutiveDays(employeeId, shift, existingAssignments, allShifts);
  if (consecutiveDays > constraints.max_consecutive_days) {
    return false;
  }

  return true;
}

function calculateWeeklyHours(
  employeeId: string,
  newShift: Shift,
  assignments: Assignment[],
  allShifts: Shift[]
): number {
  const assignedShifts = assignments
    .filter((a) => a.employee_id === employeeId)
    .map((assignment) => allShifts.find((s) => s.id === assignment.shift_id))
    .filter((shift): shift is Shift => shift !== undefined);

  return assignedShifts.reduce(
    (total, shift) => total + calculateShiftHours(shift),
    0
  );
}

function calculateShiftHours(shift: Shift): number {
  const start = new Date(`1970-01-01T${shift.start_time}`);
  const end = new Date(`1970-01-01T${shift.end_time}`);
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

function calculateConsecutiveDays(
  employeeId: string,
  newShift: Shift,
  assignments: Assignment[],
  allShifts: Shift[]
): number {
  const assignedDays = new Set<string>();
  
  assignments
    .filter((a) => a.employee_id === employeeId)
    .forEach((assignment) => {
      const shift = allShifts.find((s) => s.id === assignment.shift_id);
      if (shift) {
        assignedDays.add(shift.day);
      }
    });
  assignedDays.add(newShift.day);

  // Convert days to numbers (0-6) and sort
  const dayNumbers = Array.from(assignedDays)
    .map((day) => getDayNumber(day))
    .sort((a, b) => a - b);

  // Find longest consecutive sequence
  let maxConsecutive = 1;
  let currentConsecutive = 1;
  for (let i = 1; i < dayNumbers.length; i++) {
    if (dayNumbers[i] === dayNumbers[i - 1] + 1) {
      currentConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    } else {
      currentConsecutive = 1;
    }
  }

  return maxConsecutive;
}

function getDayNumber(day: string): number {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days.indexOf(day);
} 