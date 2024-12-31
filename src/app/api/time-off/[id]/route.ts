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

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    // Only managers can approve/reject time-off requests
    if (profile.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get the time-off request
    const { data: timeOffRequest, error: requestError } = await supabase
      .from('time_off_requests')
      .select('*')
      .eq('id', params.id)
      .single();

    if (requestError || !timeOffRequest) {
      return NextResponse.json(
        { error: 'Time-off request not found' },
        { status: 404 }
      );
    }

    // Check if the request is still pending
    if (timeOffRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Time-off request is no longer pending' },
        { status: 400 }
      );
    }

    // Update the request status
    const { error: updateError } = await supabase
      .from('time_off_requests')
      .update({ status: action === 'approve' ? 'approved' : 'rejected' })
      .eq('id', params.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update time-off request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Time-off request ${action}d successfully`,
    });
  } catch (error) {
    console.error('Error processing time-off request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 