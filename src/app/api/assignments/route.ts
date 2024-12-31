import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to verify manager role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_manager, organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Build query
    let query = supabase
      .from('shift_assignments')
      .select(`
        *,
        shift:shifts(*),
        employee:profiles(id, email, name)
      `);

    // Add date filters if provided
    if (startDate) {
      query = query.gte('shift.start_time', startDate);
    }
    if (endDate) {
      query = query.lte('shift.start_time', endDate);
    }

    // Add organization filter
    query = query.eq('shifts.organization_id', profile.organization_id);

    // Execute query
    const { data: assignments, error: assignmentsError } = await query;

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
    }

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('Error in assignments route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to verify manager role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_manager, organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!profile.is_manager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { shift_id, employee_id } = body;

    if (!shift_id || !employee_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the shift belongs to the manager's organization
    const { data: shift, error: shiftError } = await supabase
      .from('shifts')
      .select('organization_id')
      .eq('id', shift_id)
      .single();

    if (shiftError || !shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    if (shift.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Create the assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('shift_assignments')
      .insert([
        {
          shift_id,
          employee_id,
          status: 'assigned',
        },
      ])
      .select()
      .single();

    if (assignmentError) {
      console.error('Error creating assignment:', assignmentError);
      return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
    }

    return NextResponse.json(assignment);
  } catch (error) {
    console.error('Error in assignments route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to verify manager role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_manager, organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!profile.is_manager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { id, employee_id } = body;

    if (!id || !employee_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update the assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('shift_assignments')
      .update({ employee_id })
      .eq('id', id)
      .select()
      .single();

    if (assignmentError) {
      console.error('Error updating assignment:', assignmentError);
      return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
    }

    return NextResponse.json(assignment);
  } catch (error) {
    console.error('Error in assignments route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 