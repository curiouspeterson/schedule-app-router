-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('schedule_change', 'availability_change', 'time_off_request', 'shift_swap', 'system')) NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create notifications trigger
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create notifications policies
CREATE POLICY "Users can view their own notifications"
    ON notifications
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON notifications
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- Add useful indexes
CREATE INDEX idx_profiles_organization ON profiles(organization_id);
CREATE INDEX idx_shifts_organization ON shifts(organization_id);
CREATE INDEX idx_schedules_organization ON schedules(organization_id);
CREATE INDEX idx_schedules_dates ON schedules(start_date, end_date);
CREATE INDEX idx_schedule_assignments_employee ON schedule_assignments(employee_id);
CREATE INDEX idx_schedule_assignments_date ON schedule_assignments(date);
CREATE INDEX idx_employee_availability_employee ON employee_availability(employee_id);
CREATE INDEX idx_time_off_requests_employee ON time_off_requests(employee_id);
CREATE INDEX idx_time_off_requests_dates ON time_off_requests(start_date, end_date);
CREATE INDEX idx_shift_preferences_employee ON shift_preferences(employee_id);
CREATE INDEX idx_shift_swap_requests_employees ON shift_swap_requests(requesting_employee_id, target_employee_id);
CREATE INDEX idx_coverage_requirements_org_shift ON coverage_requirements(organization_id, shift_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE NOT read;

-- Create helper function for checking schedule conflicts
CREATE OR REPLACE FUNCTION check_schedule_conflicts(
    p_employee_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM schedule_assignments sa
        JOIN shifts s ON sa.shift_id = s.id
        WHERE sa.employee_id = p_employee_id
        AND sa.date = p_date
        AND (
            (s.start_time, s.end_time) OVERLAPS (p_start_time, p_end_time)
            OR
            (p_start_time BETWEEN s.start_time AND s.end_time)
            OR
            (p_end_time BETWEEN s.start_time AND s.end_time)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function for checking availability
CREATE OR REPLACE FUNCTION check_availability(
    p_employee_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME
) RETURNS BOOLEAN AS $$
DECLARE
    v_day_of_week INTEGER;
BEGIN
    -- Get day of week (0-6, Sunday is 0)
    v_day_of_week := EXTRACT(DOW FROM p_date);
    
    -- Check if there's a time off request
    IF EXISTS (
        SELECT 1 FROM time_off_requests
        WHERE employee_id = p_employee_id
        AND p_date BETWEEN start_date AND end_date
        AND status = 'approved'
    ) THEN
        RETURN false;
    END IF;
    
    -- Check if the time falls within availability
    RETURN EXISTS (
        SELECT 1 FROM employee_availability
        WHERE employee_id = p_employee_id
        AND day_of_week = v_day_of_week
        AND start_time <= p_start_time
        AND end_time >= p_end_time
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function for processing shift swaps
CREATE OR REPLACE FUNCTION process_shift_swap(
    p_swap_request_id UUID,
    p_new_status swap_request_status
) RETURNS VOID AS $$
DECLARE
    v_request shift_swap_requests;
    v_assignment schedule_assignments;
BEGIN
    -- Get the swap request
    SELECT * INTO v_request
    FROM shift_swap_requests
    WHERE id = p_swap_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Swap request not found';
    END IF;

    IF v_request.status != 'pending' THEN
        RAISE EXCEPTION 'Swap request is not pending';
    END IF;

    -- Update the swap request status
    UPDATE shift_swap_requests
    SET status = p_new_status,
        updated_at = NOW()
    WHERE id = p_swap_request_id;

    -- If approved, update the shift assignment
    IF p_new_status = 'approved' THEN
        -- Get the shift assignment
        SELECT * INTO v_assignment
        FROM schedule_assignments
        WHERE id = v_request.schedule_assignment_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Shift assignment not found';
        END IF;

        -- Update the employee assigned to the shift
        UPDATE schedule_assignments
        SET employee_id = v_request.target_employee_id,
            updated_at = NOW()
        WHERE id = v_request.schedule_assignment_id;

        -- Create notifications for both employees
        INSERT INTO notifications (user_id, title, message, type)
        VALUES
        (v_request.requesting_employee_id, 
         'Shift Swap Approved',
         'Your shift swap request has been approved',
         'shift_swap'),
        (v_request.target_employee_id,
         'New Shift Assignment',
         'You have been assigned a new shift through a swap',
         'shift_swap');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 