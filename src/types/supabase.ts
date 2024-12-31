import { Database } from './supabase-types'

type Tables = Database['public']['Tables']

export type Profile = Tables['profiles']['Row']
export type Shift = Tables['shifts']['Row']
export type BaseScheduleAssignment = Tables['schedule_assignments']['Row']
export type BaseShiftSwapRequest = Tables['shift_swap_requests']['Row']
export type AvailabilityPattern = Tables['availability_patterns']['Row']

// Helper type for Supabase's array responses
type ArrayElement<ArrayType extends readonly unknown[]> = 
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

// Helper type for Supabase's joined responses
type UnwrapArray<T> = T extends (infer U)[] ? U : T;

export type ScheduleAssignmentResponse = {
  id: string
  schedule_id: string
  employee_id: string
  shift_id: string
  date: string
  created_at: string
  updated_at: string
  shift: Shift | Shift[]
}

export type ScheduleAssignment = {
  id: string
  schedule_id: string
  employee_id: string
  shift_id: string
  date: string
  created_at: string
  updated_at: string
  shift: Shift
}

export type ShiftSwapRequestResponse = {
  id: string
  requesting_employee_id: string
  target_employee_id: string
  shift_assignment_id: string
  status: string
  created_at: string
  updated_at: string
  requesting_employee: Profile | Profile[]
  target_employee: Profile | Profile[]
  schedule_assignment: {
    id: string
    schedule_id: string
    employee_id: string
    shift_id: string
    date: string
    created_at: string
    updated_at: string
    shift: Shift | Shift[]
  } | {
    id: string
    schedule_id: string
    employee_id: string
    shift_id: string
    date: string
    created_at: string
    updated_at: string
    shift: Shift | Shift[]
  }[]
}

export type ShiftSwapRequest = {
  id: string
  requesting_employee_id: string
  target_employee_id: string
  shift_assignment_id: string
  status: string
  created_at: string
  updated_at: string
  requesting_employee: Profile
  target_employee: Profile
  schedule_assignment: ScheduleAssignment
}

export type DatabaseResponse<T> = T extends object ? (T | null) : T 