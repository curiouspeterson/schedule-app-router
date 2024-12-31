import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { shiftAssignmentId, targetEmployeeId } = body;

    if (!shiftAssignmentId || !targetEmployeeId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the shift assignment to verify ownership
    const { data: assignment, error: assignmentError } = await supabase
      .from('schedule_assignments')
      .select('*')
      .eq('id', shiftAssignmentId)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Shift assignment not found' },
        { status: 404 }
      );
    }

    // Verify the requesting user owns the shift
    if (assignment.employee_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if there's already a pending swap request for this shift
    const { data: existingRequest, error: existingError } = await supabase
      .from('shift_swap_requests')
      .select('*')
      .eq('shift_assignment_id', shiftAssignmentId)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return NextResponse.json(
        { error: 'A pending swap request already exists for this shift' },
        { status: 400 }
      );
    }

    // Create the swap request
    const { data: swapRequest, error: swapError } = await supabase
      .from('shift_swap_requests')
      .insert({
        requesting_employee_id: user.id,
        target_employee_id: targetEmployeeId,
        shift_assignment_id: shiftAssignmentId,
      })
      .select()
      .single();

    if (swapError) {
      console.error('Error creating swap request:', swapError);
      return NextResponse.json(
        { error: 'Failed to create swap request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Shift swap request created successfully',
      data: swapRequest,
    });
  } catch (error) {
    console.error('Error creating shift swap request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 