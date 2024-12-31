import { describe, it, expect } from 'vitest';
import {
  isTimeRangeValid,
  doTimeRangesOverlap,
  validateAvailabilityPattern,
  validateShiftAgainstAvailability,
  validateShiftOverlap,
} from '@/lib/scheduling/validation';

describe('Scheduling Validation', () => {
  describe('isTimeRangeValid', () => {
    it('returns false for empty time ranges', () => {
      expect(isTimeRangeValid({ start_time: '', end_time: '' })).toBe(false);
      expect(isTimeRangeValid({ start_time: '09:00', end_time: '' })).toBe(false);
      expect(isTimeRangeValid({ start_time: '', end_time: '17:00' })).toBe(false);
    });

    it('returns false when end time is before start time', () => {
      expect(isTimeRangeValid({ start_time: '17:00', end_time: '09:00' })).toBe(false);
    });

    it('returns true for valid time ranges', () => {
      expect(isTimeRangeValid({ start_time: '09:00', end_time: '17:00' })).toBe(true);
      expect(isTimeRangeValid({ start_time: '00:00', end_time: '23:59' })).toBe(true);
    });
  });

  describe('doTimeRangesOverlap', () => {
    it('returns false for non-overlapping ranges', () => {
      const range1 = { start_time: '09:00', end_time: '12:00' };
      const range2 = { start_time: '13:00', end_time: '17:00' };
      expect(doTimeRangesOverlap(range1, range2)).toBe(false);
    });

    it('returns true for overlapping ranges', () => {
      const range1 = { start_time: '09:00', end_time: '13:00' };
      const range2 = { start_time: '12:00', end_time: '17:00' };
      expect(doTimeRangesOverlap(range1, range2)).toBe(true);
    });

    it('returns true for contained ranges', () => {
      const range1 = { start_time: '09:00', end_time: '17:00' };
      const range2 = { start_time: '12:00', end_time: '13:00' };
      expect(doTimeRangesOverlap(range1, range2)).toBe(true);
    });

    it('returns false for invalid ranges', () => {
      const range1 = { start_time: '', end_time: '17:00' };
      const range2 = { start_time: '09:00', end_time: '12:00' };
      expect(doTimeRangesOverlap(range1, range2)).toBe(false);
    });
  });

  describe('validateAvailabilityPattern', () => {
    it('returns error for missing times', () => {
      expect(validateAvailabilityPattern({ start_time: '', end_time: '' }))
        .toBe('Both start time and end time must be provided');
      expect(validateAvailabilityPattern({ start_time: '09:00', end_time: '' }))
        .toBe('Both start time and end time must be provided');
    });

    it('returns error for invalid time range', () => {
      expect(validateAvailabilityPattern({ start_time: '17:00', end_time: '09:00' }))
        .toBe('End time must be after start time');
    });

    it('returns null for valid pattern', () => {
      expect(validateAvailabilityPattern({ start_time: '09:00', end_time: '17:00' }))
        .toBeNull();
    });
  });

  describe('validateShiftAgainstAvailability', () => {
    it('returns false when shift is outside availability', () => {
      const shift = { start_time: '08:00', end_time: '16:00' };
      const availability = { start_time: '09:00', end_time: '17:00' };
      expect(validateShiftAgainstAvailability(shift, availability)).toBe(false);
    });

    it('returns true when shift is within availability', () => {
      const shift = { start_time: '10:00', end_time: '16:00' };
      const availability = { start_time: '09:00', end_time: '17:00' };
      expect(validateShiftAgainstAvailability(shift, availability)).toBe(true);
    });

    it('returns false for invalid patterns', () => {
      const shift = { start_time: '', end_time: '16:00' };
      const availability = { start_time: '09:00', end_time: '17:00' };
      expect(validateShiftAgainstAvailability(shift, availability)).toBe(false);
    });
  });

  describe('validateShiftOverlap', () => {
    it('returns true when shift does not overlap with existing shifts', () => {
      const shift = { start_time: '09:00', end_time: '12:00' };
      const existingShifts = [
        { start_time: '13:00', end_time: '17:00' },
        { start_time: '18:00', end_time: '22:00' },
      ];
      expect(validateShiftOverlap(shift, existingShifts)).toBe(true);
    });

    it('returns false when shift overlaps with existing shifts', () => {
      const shift = { start_time: '11:00', end_time: '14:00' };
      const existingShifts = [
        { start_time: '09:00', end_time: '12:00' },
        { start_time: '13:00', end_time: '17:00' },
      ];
      expect(validateShiftOverlap(shift, existingShifts)).toBe(false);
    });

    it('returns true for empty existing shifts', () => {
      const shift = { start_time: '09:00', end_time: '17:00' };
      expect(validateShiftOverlap(shift, [])).toBe(true);
    });
  });
}); 