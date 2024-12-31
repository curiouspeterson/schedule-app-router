-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Organizations policies
CREATE POLICY "Users can view organizations they belong to"
ON organizations FOR SELECT
TO authenticated
USING (id IN (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
));

-- Shifts policies
CREATE POLICY "Users can view shifts in their organization"
ON shifts FOR SELECT
TO authenticated
USING (organization_id IN (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
));

-- Schedule assignments policies
CREATE POLICY "Users can view their own schedule assignments"
ON schedule_assignments FOR SELECT
TO authenticated
USING (
  employee_id = auth.uid() OR
  schedule_id IN (
    SELECT s.id FROM schedules s
    JOIN profiles p ON p.organization_id = s.organization_id
    WHERE p.id = auth.uid()
  )
);

-- Employee availability policies
CREATE POLICY "Users can view and manage their own availability"
ON employee_availability FOR ALL
TO authenticated
USING (employee_id = auth.uid())
WITH CHECK (employee_id = auth.uid());

-- Time off requests policies
CREATE POLICY "Users can view and manage their own time off requests"
ON time_off_requests FOR ALL
TO authenticated
USING (employee_id = auth.uid())
WITH CHECK (employee_id = auth.uid());

-- Shift swap requests policies
CREATE POLICY "Users can view swap requests they're involved in"
ON shift_swap_requests FOR SELECT
TO authenticated
USING (
  from_assignment_id IN (
    SELECT id FROM schedule_assignments WHERE employee_id = auth.uid()
  ) OR
  to_employee_id = auth.uid()
);

CREATE POLICY "Users can create swap requests for their shifts"
ON shift_swap_requests FOR INSERT
TO authenticated
WITH CHECK (
  from_assignment_id IN (
    SELECT id FROM schedule_assignments WHERE employee_id = auth.uid()
  )
);

-- Coverage requirements policies
CREATE POLICY "Users can view coverage requirements for their organization"
ON coverage_requirements FOR SELECT
TO authenticated
USING (organization_id IN (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
)); 