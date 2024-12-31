-- Create enum type for swap request status
CREATE TYPE swap_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- Create shift swap requests table
CREATE TABLE IF NOT EXISTS shift_swap_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requesting_employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    target_employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    schedule_assignment_id UUID REFERENCES schedule_assignments(id) ON DELETE CASCADE NOT NULL,
    status swap_request_status NOT NULL DEFAULT 'pending',
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT different_employees CHECK (requesting_employee_id != target_employee_id)
);

-- Enable RLS
ALTER TABLE shift_swap_requests ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
CREATE TRIGGER update_shift_swap_requests_updated_at
    BEFORE UPDATE ON shift_swap_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create policies for shift swap requests
CREATE POLICY "Users can view their own shift swap requests"
    ON shift_swap_requests
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() IN (requesting_employee_id, target_employee_id) OR
        EXISTS (
            SELECT 1 FROM profiles p1
            WHERE p1.id = auth.uid()
            AND p1.is_manager = true
            AND p1.organization_id = (
                SELECT organization_id FROM profiles p2 
                WHERE p2.id = shift_swap_requests.requesting_employee_id
            )
        )
    );

CREATE POLICY "Users can create shift swap requests"
    ON shift_swap_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = requesting_employee_id);

CREATE POLICY "Users can update their own shift swap requests"
    ON shift_swap_requests
    FOR UPDATE
    TO authenticated
    USING (
        (auth.uid() = requesting_employee_id AND status = 'pending') OR
        (auth.uid() = target_employee_id AND status = 'pending') OR
        EXISTS (
            SELECT 1 FROM profiles p1
            WHERE p1.id = auth.uid()
            AND p1.is_manager = true
            AND p1.organization_id = (
                SELECT organization_id FROM profiles p2 
                WHERE p2.id = shift_swap_requests.requesting_employee_id
            )
        )
    ); 