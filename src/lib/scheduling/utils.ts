import { Employee, Shift, ShiftAssignment, SchedulingConstraints } from './types';

export function getShiftHours(shift: Shift): number {
  const start = new Date(shift.start_time);
  const end = new Date(shift.end_time);
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

export function isEmployeeAvailable(
  employee: Employee,
  shift: Shift,
  assignments: ShiftAssignment[]
): boolean {
  // Check if employee has the required role
  if (employee.role !== shift.role) {
    return false;
  }

  // Check if employee is already assigned to another shift at this time
  const shiftStart = new Date(shift.start_time);
  const shiftEnd = new Date(shift.end_time);

  return !assignments.some(assignment => {
    if (assignment.employee_id !== employee.id) return false;

    const existingShiftStart = new Date(shift.start_time);
    const existingShiftEnd = new Date(shift.end_time);

    return (
      (shiftStart >= existingShiftStart && shiftStart < existingShiftEnd) ||
      (shiftEnd > existingShiftStart && shiftEnd <= existingShiftEnd) ||
      (shiftStart <= existingShiftStart && shiftEnd >= existingShiftEnd)
    );
  });
}

export function checkConstraints(
  employee: Employee,
  shift: Shift,
  assignments: ShiftAssignment[],
  constraints: Partial<SchedulingConstraints> = {}
): boolean {
  const shiftHours = getShiftHours(shift);
  const shiftStart = new Date(shift.start_time);
  const shiftEnd = new Date(shift.end_time);

  // Check max hours per day
  const maxHoursPerDay = constraints.maxHoursPerDay;
  if (maxHoursPerDay) {
    const dayStart = new Date(shiftStart);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const dayAssignments = assignments.filter(assignment => {
      const assignmentStart = new Date(shift.start_time);
      return assignmentStart >= dayStart && assignmentStart <= dayEnd;
    });

    const totalHours = dayAssignments.reduce(
      (sum, assignment) => sum + getShiftHours(shift),
      0
    );

    if (totalHours + shiftHours > maxHoursPerDay) {
      return false;
    }
  }

  // Check minimum hours between shifts
  const minHoursBetweenShifts = constraints.minHoursBetweenShifts;
  if (minHoursBetweenShifts) {
    const hasConflict = assignments.some(assignment => {
      const assignmentStart = new Date(shift.start_time);
      const assignmentEnd = new Date(shift.end_time);
      const hoursBefore = (shiftStart.getTime() - assignmentEnd.getTime()) / (1000 * 60 * 60);
      const hoursAfter = (assignmentStart.getTime() - shiftEnd.getTime()) / (1000 * 60 * 60);

      return (
        Math.abs(hoursBefore) < minHoursBetweenShifts ||
        Math.abs(hoursAfter) < minHoursBetweenShifts
      );
    });

    if (hasConflict) {
      return false;
    }
  }

  // Check maximum consecutive days
  const maxConsecutiveDays = constraints.maxConsecutiveDays;
  if (maxConsecutiveDays) {
    const shiftDate = new Date(shift.start_time);
    shiftDate.setHours(0, 0, 0, 0);

    let consecutiveDays = 1;
    let currentDate = new Date(shiftDate);

    // Count backward
    while (consecutiveDays <= maxConsecutiveDays) {
      currentDate.setDate(currentDate.getDate() - 1);
      const hasShift = assignments.some(assignment => {
        const assignmentDate = new Date(shift.start_time);
        assignmentDate.setHours(0, 0, 0, 0);
        return assignmentDate.getTime() === currentDate.getTime();
      });

      if (!hasShift) break;
      consecutiveDays++;
    }

    // Count forward
    currentDate = new Date(shiftDate);
    while (consecutiveDays <= maxConsecutiveDays) {
      currentDate.setDate(currentDate.getDate() + 1);
      const hasShift = assignments.some(assignment => {
        const assignmentDate = new Date(shift.start_time);
        assignmentDate.setHours(0, 0, 0, 0);
        return assignmentDate.getTime() === currentDate.getTime();
      });

      if (!hasShift) break;
      consecutiveDays++;
    }

    if (consecutiveDays > maxConsecutiveDays) {
      return false;
    }
  }

  return true;
} 