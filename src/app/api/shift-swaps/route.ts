import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get('employeeId');

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build query
    let query = supabase
      .from('shift_swap_requests')
      .select(`
        *,
        from_assignment:shift_assignments(
          *,
          shift:shifts(*),
          employee:profiles(id, name)
        )
      `);

    // Add filters
    if (employeeId) {
      query = query.or(`to_employee_id.eq.${employeeId},from_assignment.employee_id.eq.${employeeId}`);
    }

    // Execute query
    const { data: swapRequests, error: swapRequestsError } = await query;

    if (swapRequestsError) {
      console.error('Error fetching swap requests:', swapRequestsError);
      return NextResponse.json({ error: 'Failed to fetch swap requests' }, { status: 500 });
    }

    return NextResponse.json(swapRequests);
  } catch (error) {
    console.error('Error in shift-swaps route:', error);
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

    const body = await request.json();
    const { from_assignment_id, to_employee_id } = body;

    if (!from_assignment_id || !to_employee_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the assignment belongs to the requesting user
    const { data: assignment, error: assignmentError } = await supabase
      .from('shift_assignments')
      .select('employee_id')
      .eq('id', from_assignment_id)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    if (assignment.employee_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Create the swap request
    const { data: swapRequest, error: swapRequestError } = await supabase
      .from('shift_swap_requests')
      .insert([
        {
          from_assignment_id,
          to_employee_id,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (swapRequestError) {
      console.error('Error creating swap request:', swapRequestError);
      return NextResponse.json({ error: 'Failed to create swap request' }, { status: 500 });
    }

    return NextResponse.json(swapRequest);
  } catch (error) {
    console.error('Error in shift-swaps route:', error);
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

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Verify the swap request is for the current user
    const { data: swapRequest, error: swapRequestError } = await supabase
      .from('shift_swap_requests')
      .select('to_employee_id')
      .eq('id', id)
      .single();

    if (swapRequestError || !swapRequest) {
      return NextResponse.json({ error: 'Swap request not found' }, { status: 404 });
    }

    if (swapRequest.to_employee_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update the swap request
    const { data: updatedSwapRequest, error: updateError } = await supabase
      .from('shift_swap_requests')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating swap request:', updateError);
      return NextResponse.json({ error: 'Failed to update swap request' }, { status: 500 });
    }

    // If approved, swap the assignments
    if (status === 'approved') {
      const { data: originalAssignment, error: originalAssignmentError } = await supabase
        .from('shift_assignments')
        .select('*')
        .eq('id', updatedSwapRequest.from_assignment_id)
        .single();

      if (originalAssignmentError || !originalAssignment) {
        return NextResponse.json({ error: 'Failed to fetch original assignment' }, { status: 500 });
      }

      // Update the assignment with the new employee
      const { error: assignmentUpdateError } = await supabase
        .from('shift_assignments')
        .update({ employee_id: user.id })
        .eq('id', updatedSwapRequest.from_assignment_id);

      if (assignmentUpdateError) {
        console.error('Error updating assignment:', assignmentUpdateError);
        return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
      }
    }

    return NextResponse.json(updatedSwapRequest);
  } catch (error) {
    console.error('Error in shift-swaps route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 