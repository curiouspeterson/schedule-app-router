-- Policies for organizations
CREATE POLICY "Anyone can view organizations"
    ON organizations
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only managers can create organizations"
    ON organizations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_manager = true
        )
    );

CREATE POLICY "Only managers can update their organization"
    ON organizations
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_manager = true
            AND profiles.organization_id = organizations.id
        )
    );

-- Policies for profiles
CREATE POLICY "Users can view profiles in their organization"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = id OR
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.organization_id = profiles.organization_id
        )
    );

CREATE POLICY "Users can update their own profile"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Policies for shifts
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

-- Policies for schedules
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

-- Policies for schedule assignments
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

-- Policies for employee availability
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

-- Policies for time off requests
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

-- Policies for shift preferences
CREATE POLICY "Users can view shift preferences in their organization"
    ON shift_preferences
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = employee_id OR
        EXISTS (
            SELECT 1 FROM profiles p1
            WHERE p1.id = auth.uid()
            AND p1.is_manager = true
            AND p1.organization_id = (
                SELECT organization_id FROM profiles p2 WHERE p2.id = shift_preferences.employee_id
            )
        )
    );

CREATE POLICY "Users can manage their own shift preferences"
    ON shift_preferences
    FOR ALL
    TO authenticated
    USING (auth.uid() = employee_id);

-- Policies for shift swap requests
CREATE POLICY "Users can view relevant shift swap requests"
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

CREATE POLICY "Users can update relevant shift swap requests"
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

-- Policies for coverage requirements
CREATE POLICY "Users can view coverage requirements in their organization"
    ON coverage_requirements
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.organization_id = coverage_requirements.organization_id
        )
    );

CREATE POLICY "Only managers can manage coverage requirements"
    ON coverage_requirements
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_manager = true
            AND profiles.organization_id = coverage_requirements.organization_id
        )
    ); 