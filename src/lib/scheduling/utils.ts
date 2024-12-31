import { Employee, Shift, ShiftAssignment, SchedulingConstraints, Availability } from './types';
import { ShiftPreference, ShiftType, PreferenceLevel } from './preferences';

export function getShiftHours(shift: Shift): number {
  const start = new Date(shift.start_time);
  const end = new Date(shift.end_time);
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

export function isEmployeeAvailable(employee: Employee, shift: Shift, existingAssignments: ShiftAssignment[]): boolean {
  // Check if employee is already assigned to this shift
  if (existingAssignments.some(a => a.shift_id === shift.id)) {
    return false;
  }

  // Check if employee has overlapping shifts
  const shiftStart = new Date(shift.start_time);
  const shiftEnd = new Date(shift.end_time);

  return !existingAssignments.some(assignment => {
    const assignmentStart = new Date(assignment.shift?.start_time || '');
    const assignmentEnd = new Date(assignment.shift?.end_time || '');
    return (
      (shiftStart >= assignmentStart && shiftStart < assignmentEnd) ||
      (shiftEnd > assignmentStart && shiftEnd <= assignmentEnd) ||
      (shiftStart <= assignmentStart && shiftEnd >= assignmentEnd)
    );
  });
}

export function checkConstraints(
  employee: Employee,
  shift: Shift,
  existingAssignments: ShiftAssignment[],
  constraints: SchedulingConstraints
): boolean {
  const shiftHours = getShiftHours(shift);
  const shiftDate = new Date(shift.start_time);

  // Check max hours per day
  const dayAssignments = existingAssignments.filter(a => {
    const assignmentDate = new Date(a.shift?.start_time || '');
    return assignmentDate.toDateString() === shiftDate.toDateString();
  });

  const dailyHours = dayAssignments.reduce((total, a) => {
    return total + (a.shift ? getShiftHours(a.shift) : 0);
  }, 0);

  if (dailyHours + shiftHours > constraints.maxHoursPerDay) {
    return false;
  }

  // Check minimum hours between shifts
  const prevShift = existingAssignments
    .filter(a => new Date(a.shift?.end_time || '') <= shiftDate)
    .sort((a, b) => {
      const dateA = new Date(a.shift?.end_time || '');
      const dateB = new Date(b.shift?.end_time || '');
      return dateB.getTime() - dateA.getTime();
    })[0];

  if (prevShift && prevShift.shift) {
    const prevEnd = new Date(prevShift.shift.end_time);
    const hoursBetween = (shiftDate.getTime() - prevEnd.getTime()) / (1000 * 60 * 60);
    if (hoursBetween < constraints.minHoursBetweenShifts) {
      return false;
    }
  }

  // Check consecutive days
  const consecutiveDays = getConsecutiveDays(existingAssignments, shiftDate);
  if (consecutiveDays >= constraints.maxConsecutiveDays) {
    return false;
  }

  return true;
}

function getConsecutiveDays(assignments: ShiftAssignment[], currentDate: Date): number {
  let consecutiveDays = 1;
  let date = new Date(currentDate);
  date.setDate(date.getDate() - 1);

  while (true) {
    const hasAssignment = assignments.some(a => {
      const assignmentDate = new Date(a.shift?.start_time || '');
      return assignmentDate.toDateString() === date.toDateString();
    });

    if (!hasAssignment) break;
    consecutiveDays++;
    date.setDate(date.getDate() - 1);
  }

  return consecutiveDays;
}

export function convertAvailabilityToPreferences(availability: Availability[]): ShiftPreference[] {
  const preferences: ShiftPreference[] = [];

  availability.forEach(avail => {
    const startHour = parseInt(avail.start_time.split(':')[0], 10);
    const endHour = parseInt(avail.end_time.split(':')[0], 10);

    // Convert time ranges to shift types
    const shiftTypes: ShiftType[] = [];
    if (startHour <= 12 && endHour >= 11) shiftTypes.push('morning');
    if (startHour <= 17 && endHour >= 16) shiftTypes.push('afternoon');
    if (startHour <= 22 && endHour >= 21) shiftTypes.push('evening');

    // Create a preference for each available shift type
    shiftTypes.forEach(shiftType => {
      preferences.push({
        id: `${avail.employee_id}-${shiftType}-${avail.day_of_week}`,
        employee_id: avail.employee_id,
        day_of_week: avail.day_of_week,
        shift_type: shiftType,
        preference_level: 'neutral',
      });
    });
  });

  return preferences;
} 