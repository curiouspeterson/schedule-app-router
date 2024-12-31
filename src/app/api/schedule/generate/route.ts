import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { addDays, format, startOfWeek } from 'date-fns';
import { generateSchedule } from '@/lib/scheduling/generator';
import type { Employee, Shift, Availability, CoverageRequirement } from '@/lib/scheduling/types';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a manager
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the start date for the schedule (defaults to next week)
    const body = await request.json();
    const startDate = body.startDate ? new Date(body.startDate) : startOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 });

    // Create a new schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .insert({
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(addDays(startDate, 6), 'yyyy-MM-dd'),
        created_by: user.id,
        status: 'draft',
      })
      .select()
      .single();

    if (scheduleError) {
      return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
    }

    // Get all employees
    const { data: employees, error: employeesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'employee');

    if (employeesError) {
      return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
    }

    // Get all shifts
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('*');

    if (shiftsError) {
      return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 });
    }

    // Get employee availability
    const { data: availability, error: availabilityError } = await supabase
      .from('employee_availability')
      .select('*');

    if (availabilityError) {
      return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
    }

    // Get coverage requirements
    const { data: coverage, error: coverageError } = await supabase
      .from('coverage_requirements')
      .select('*')
      .gte('date', format(startDate, 'yyyy-MM-dd'))
      .lte('date', format(addDays(startDate, 6), 'yyyy-MM-dd'));

    if (coverageError) {
      return NextResponse.json({ error: 'Failed to fetch coverage requirements' }, { status: 500 });
    }

    // Generate the schedule
    const result = await generateSchedule(
      schedule.id,
      startDate,
      employees as Employee[],
      shifts as Shift[],
      availability as Availability[],
      coverage as CoverageRequirement[],
      body.constraints
    );

    // Insert the assignments
    if (result.assignments.length > 0) {
      const { error: assignmentError } = await supabase
        .from('schedule_assignments')
        .insert(result.assignments);

      if (assignmentError) {
        return NextResponse.json({ error: 'Failed to create assignments' }, { status: 500 });
      }
    }

    return NextResponse.json({
      message: 'Schedule generated successfully',
      schedule,
      stats: {
        totalAssignments: result.assignments.length,
        unassignedShifts: result.unassignedShifts.length,
        employeeStats: result.employeeStats,
      },
    });
  } catch (error) {
    console.error('Error generating schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 