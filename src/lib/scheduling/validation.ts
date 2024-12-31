import { parse, isWithinInterval, areIntervalsOverlapping } from 'date-fns';

interface TimeSlot {
  start_time: string;
  end_time: string;
}

export function doTimeRangesOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  const start1 = new Date(`1970-01-01T${slot1.start_time}`);
  const end1 = new Date(`1970-01-01T${slot1.end_time}`);
  const start2 = new Date(`1970-01-01T${slot2.start_time}`);
  const end2 = new Date(`1970-01-01T${slot2.end_time}`);

  return start1 < end2 && start2 < end1;
}

export function validateTimeSlot(slot: TimeSlot): string | null {
  const start = new Date(`1970-01-01T${slot.start_time}`);
  const end = new Date(`1970-01-01T${slot.end_time}`);

  if (isNaN(start.getTime())) {
    return 'Invalid start time format';
  }

  if (isNaN(end.getTime())) {
    return 'Invalid end time format';
  }

  if (start >= end) {
    return 'Start time must be before end time';
  }

  return null;
}

export function validateConstraints(
  maxWeeklyHours: number,
  maxConsecutiveDays: number
): string | null {
  if (maxWeeklyHours < 0 || maxWeeklyHours > 168) {
    return 'Maximum weekly hours must be between 0 and 168';
  }

  if (maxConsecutiveDays < 0 || maxConsecutiveDays > 7) {
    return 'Maximum consecutive days must be between 0 and 7';
  }

  return null;
}

export function validateAvailabilitySlots(
  newSlot: TimeSlot,
  existingSlots: TimeSlot[]
): string | null {
  // First validate the new slot itself
  const slotError = validateTimeSlot(newSlot);
  if (slotError) return slotError;

  // Then check for overlaps with existing slots
  for (const existingSlot of existingSlots) {
    if (doTimeRangesOverlap(newSlot, existingSlot)) {
      return 'Time slot overlaps with existing availability';
    }
  }

  return null;
}

export function validateShiftAgainstAvailability(
  shift: TimeSlot,
  availability: TimeSlot
): boolean {
  const shiftStart = new Date(`1970-01-01T${shift.start_time}`);
  const shiftEnd = new Date(`1970-01-01T${shift.end_time}`);
  const availStart = new Date(`1970-01-01T${availability.start_time}`);
  const availEnd = new Date(`1970-01-01T${availability.end_time}`);

  return shiftStart >= availStart && shiftEnd <= availEnd;
}

export function validateShiftOverlap(
  shift: TimeSlot,
  existingShifts: TimeSlot[]
): boolean {
  return !existingShifts.some(existingShift => 
    doTimeRangesOverlap(shift, existingShift)
  );
} 