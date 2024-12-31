import { createClient } from '@/lib/supabase/client';

export type PreferenceLevel = 'preferred' | 'neutral' | 'avoid';
export type ShiftType = 'morning' | 'afternoon' | 'evening';

export interface ShiftPreference {
  id: string;
  employee_id: string;
  shift_type: ShiftType;
  day_of_week: number;
  preference_level: PreferenceLevel;
  max_weekly_hours?: number;
  min_weekly_hours?: number;
  max_consecutive_days?: number;
}

export interface PreferenceWeight {
  preferred: number;
  neutral: number;
  avoid: number;
}

const DEFAULT_WEIGHTS: PreferenceWeight = {
  preferred: 1.5,
  neutral: 1.0,
  avoid: 0.5,
};

export async function getEmployeePreferences(employeeId: string): Promise<ShiftPreference[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('shift_preferences')
    .select('*')
    .eq('employee_id', employeeId);

  if (error) throw error;
  return data;
}

export async function updateShiftPreference(preference: ShiftPreference): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('shift_preferences')
    .upsert({
      id: preference.id,
      employee_id: preference.employee_id,
      shift_type: preference.shift_type,
      day_of_week: preference.day_of_week,
      preference_level: preference.preference_level,
      max_weekly_hours: preference.max_weekly_hours,
      min_weekly_hours: preference.min_weekly_hours,
      max_consecutive_days: preference.max_consecutive_days,
    });

  if (error) throw error;
}

export function calculatePreferenceScore(
  preferences: ShiftPreference[],
  shiftType: ShiftType,
  dayOfWeek: number,
  weights: PreferenceWeight = DEFAULT_WEIGHTS
): number {
  const preference = preferences.find(
    p => p.shift_type === shiftType && p.day_of_week === dayOfWeek
  );

  if (!preference) return weights.neutral;
  return weights[preference.preference_level];
}

export function validatePreferences(preferences: ShiftPreference[]): string[] {
  const errors: string[] = [];

  // Group preferences by employee
  const employeePrefs = new Map<string, ShiftPreference[]>();
  preferences.forEach(pref => {
    const empPrefs = employeePrefs.get(pref.employee_id) || [];
    empPrefs.push(pref);
    employeePrefs.set(pref.employee_id, empPrefs);
  });

  // Validate each employee's preferences
  employeePrefs.forEach((prefs, employeeId) => {
    // Check for conflicting preferences
    const prefMap = new Map<string, PreferenceLevel>();
    prefs.forEach(pref => {
      const key = `${pref.shift_type}-${pref.day_of_week}`;
      if (prefMap.has(key)) {
        errors.push(`Employee ${employeeId} has conflicting preferences for ${pref.shift_type} on day ${pref.day_of_week}`);
      }
      prefMap.set(key, pref.preference_level);
    });

    // Validate hour constraints
    prefs.forEach(pref => {
      if (pref.min_weekly_hours && pref.max_weekly_hours) {
        if (pref.min_weekly_hours > pref.max_weekly_hours) {
          errors.push(`Employee ${employeeId} has invalid weekly hours range: min > max`);
        }
        if (pref.min_weekly_hours < 0 || pref.max_weekly_hours > 168) {
          errors.push(`Employee ${employeeId} has invalid weekly hours range: outside 0-168`);
        }
      }
    });

    // Validate consecutive days
    prefs.forEach(pref => {
      if (pref.max_consecutive_days !== undefined) {
        if (pref.max_consecutive_days < 1 || pref.max_consecutive_days > 7) {
          errors.push(`Employee ${employeeId} has invalid max consecutive days: ${pref.max_consecutive_days}`);
        }
      }
    });
  });

  return errors;
}

export function getPreferredShifts(
  preferences: ShiftPreference[],
  employeeId: string
): { shiftType: ShiftType; dayOfWeek: number }[] {
  return preferences
    .filter(p => p.employee_id === employeeId && p.preference_level === 'preferred')
    .map(p => ({ shiftType: p.shift_type, dayOfWeek: p.day_of_week }));
}

export function getEmployeeConstraints(preferences: ShiftPreference[], employeeId: string) {
  const employeePrefs = preferences.filter(p => p.employee_id === employeeId);
  const latestPref = employeePrefs[employeePrefs.length - 1];

  return {
    maxWeeklyHours: latestPref?.max_weekly_hours,
    minWeeklyHours: latestPref?.min_weekly_hours,
    maxConsecutiveDays: latestPref?.max_consecutive_days,
  };
} 