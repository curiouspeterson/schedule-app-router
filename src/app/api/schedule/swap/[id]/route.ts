import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get the swap request
    const { data: swapRequest, error: swapError } = await supabase
      .from('shift_swap_requests')
      .select('*')
      .eq('id', params.id)
      .single();

    if (swapError || !swapRequest) {
      return NextResponse.json({ error: 'Swap request not found' }, { status: 404 });
    }

    // Check if the user is the target employee
    if (swapRequest.target_employee_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if the request is still pending
    if (swapRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Swap request is no longer pending' }, { status: 400 });
    }

    if (action === 'approve') {
      // Start a transaction to update both the swap request and the assignment
      const { error: transactionError } = await supabase.rpc('process_shift_swap', {
        swap_request_id: params.id,
        new_status: 'approved',
      });

      if (transactionError) {
        return NextResponse.json({ error: 'Failed to process swap request' }, { status: 500 });
      }
    } else {
      // Just update the swap request status to rejected
      const { error: updateError } = await supabase
        .from('shift_swap_requests')
        .update({ status: 'rejected' })
        .eq('id', params.id);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update swap request' }, { status: 500 });
      }
    }

    return NextResponse.json({
      message: `Shift swap request ${action}ed successfully`,
    });
  } catch (error) {
    console.error('Error processing shift swap response:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 