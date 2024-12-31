import { Database } from './supabase-types'

type Tables = Database['public']['Tables']

export type Profile = Tables['profiles']['Row']
export type Shift = Tables['shifts']['Row']
export type ScheduleAssignment = Tables['schedule_assignments']['Row'] & {
  shift: Shift
}
export type AvailabilityPattern = Tables['availability_patterns']['Row']
export type ShiftSwapRequest = Tables['shift_swap_requests']['Row'] & {
  requesting_employee: Profile
  target_employee: Profile
  schedule_assignment: ScheduleAssignment
} 