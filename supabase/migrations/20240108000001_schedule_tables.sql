-- Create shifts table
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create schedules table
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT CHECK (status IN ('draft', 'published', 'archived')) DEFAULT 'draft',
    created_by UUID REFERENCES profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create schedule_assignments table
CREATE TABLE IF NOT EXISTS schedule_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(employee_id, date, shift_id)
);

-- Create employee_availability table
CREATE TABLE IF NOT EXISTS employee_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(employee_id, day_of_week)
);

-- Create time_off_requests table
CREATE TABLE IF NOT EXISTS time_off_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;

-- Create triggers for updated_at
CREATE TRIGGER update_shifts_updated_at
    BEFORE UPDATE ON shifts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at
    BEFORE UPDATE ON schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_assignments_updated_at
    BEFORE UPDATE ON schedule_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_availability_updated_at
    BEFORE UPDATE ON employee_availability
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_off_requests_updated_at
    BEFORE UPDATE ON time_off_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create policies for shifts
CREATE POLICY "Users can view shifts in their organization"
    ON shifts
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.organization_id = shifts.organization_id
        )
    );

CREATE POLICY "Only managers can manage shifts"
    ON shifts
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_manager = true
            AND profiles.organization_id = shifts.organization_id
        )
    );

-- Create policies for schedules
CREATE POLICY "Users can view schedules in their organization"
    ON schedules
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.organization_id = schedules.organization_id
        )
    );

CREATE POLICY "Only managers can manage schedules"
    ON schedules
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_manager = true
            AND profiles.organization_id = schedules.organization_id
        )
    );

-- Create policies for schedule assignments
CREATE POLICY "Users can view their schedule assignments"
    ON schedule_assignments
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = employee_id OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_manager = true
            AND profiles.organization_id = (
                SELECT organization_id FROM schedules WHERE id = schedule_assignments.schedule_id
            )
        )
    );

CREATE POLICY "Only managers can manage schedule assignments"
    ON schedule_assignments
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_manager = true
            AND profiles.organization_id = (
                SELECT organization_id FROM schedules WHERE id = schedule_assignments.schedule_id
            )
        )
    );

-- Create policies for employee availability
CREATE POLICY "Users can view their own availability"
    ON employee_availability
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = employee_id OR
        EXISTS (
            SELECT 1 FROM profiles p1
            WHERE p1.id = auth.uid()
            AND p1.is_manager = true
            AND p1.organization_id = (
                SELECT organization_id FROM profiles p2 WHERE p2.id = employee_availability.employee_id
            )
        )
    );

CREATE POLICY "Users can manage their own availability"
    ON employee_availability
    FOR ALL
    TO authenticated
    USING (auth.uid() = employee_id);

-- Create policies for time off requests
CREATE POLICY "Users can view their own time off requests"
    ON time_off_requests
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = employee_id OR
        EXISTS (
            SELECT 1 FROM profiles p1
            WHERE p1.id = auth.uid()
            AND p1.is_manager = true
            AND p1.organization_id = (
                SELECT organization_id FROM profiles p2 WHERE p2.id = time_off_requests.employee_id
            )
        )
    );

CREATE POLICY "Users can create their own time off requests"
    ON time_off_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Users can update their own pending time off requests"
    ON time_off_requests
    FOR UPDATE
    TO authenticated
    USING (
        (auth.uid() = employee_id AND status = 'pending') OR
        EXISTS (
            SELECT 1 FROM profiles p1
            WHERE p1.id = auth.uid()
            AND p1.is_manager = true
            AND p1.organization_id = (
                SELECT organization_id FROM profiles p2 WHERE p2.id = time_off_requests.employee_id
            )
        )
    ); 