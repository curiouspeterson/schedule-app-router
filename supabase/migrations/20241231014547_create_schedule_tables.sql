-- Create availability table
CREATE TABLE IF NOT EXISTS availability (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day TEXT NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (start_time < end_time),
    UNIQUE (employee_id, day, start_time, end_time)
);

-- Create shift preferences table
CREATE TABLE IF NOT EXISTS shift_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day TEXT NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    time_range TEXT NOT NULL CHECK (time_range IN ('Morning (6:00 - 12:00)', 'Afternoon (12:00 - 18:00)', 'Evening (18:00 - 24:00)')),
    preference_type TEXT NOT NULL CHECK (preference_type IN ('preferred', 'neutral', 'avoid')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id, day, time_range)
);

-- Create employee constraints table
CREATE TABLE IF NOT EXISTS employee_constraints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    max_weekly_hours INTEGER NOT NULL CHECK (max_weekly_hours >= 0 AND max_weekly_hours <= 168),
    max_consecutive_days INTEGER NOT NULL CHECK (max_consecutive_days >= 0 AND max_consecutive_days <= 7),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id)
);

-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    publish_status TEXT NOT NULL DEFAULT 'draft' CHECK (publish_status IN ('draft', 'review', 'published')),
    version INTEGER NOT NULL DEFAULT 1,
    published_at TIMESTAMPTZ,
    published_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (shift_id, employee_id, version)
);

-- Create schedule_versions table to track schedule history
CREATE TABLE IF NOT EXISTS schedule_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    version INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published')),
    published_at TIMESTAMPTZ,
    published_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (organization_id, week_start, version)
);

-- Create schedule_changes table to track modifications
CREATE TABLE IF NOT EXISTS schedule_changes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_version_id UUID NOT NULL REFERENCES schedule_versions(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    change_type TEXT NOT NULL CHECK (change_type IN ('added', 'removed', 'modified')),
    previous_employee_id UUID REFERENCES auth.users(id),
    new_employee_id UUID REFERENCES auth.users(id),
    changed_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('schedule_published', 'schedule_review', 'assignment_changed', 'shift_added', 'shift_removed')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to all tables
CREATE TRIGGER update_availability_updated_at
    BEFORE UPDATE ON availability
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shift_preferences_updated_at
    BEFORE UPDATE ON shift_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_constraints_updated_at
    BEFORE UPDATE ON employee_constraints
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_versions_updated_at
    BEFORE UPDATE ON schedule_versions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Employees can read and write their own records
CREATE POLICY "Employees can manage their own availability"
    ON availability
    FOR ALL
    USING (auth.uid() = employee_id);

CREATE POLICY "Employees can manage their own preferences"
    ON shift_preferences
    FOR ALL
    USING (auth.uid() = employee_id);

CREATE POLICY "Employees can manage their own constraints"
    ON employee_constraints
    FOR ALL
    USING (auth.uid() = employee_id);

CREATE POLICY "Employees can view their own assignments"
    ON assignments
    FOR SELECT
    USING (auth.uid() = employee_id);

-- Managers can read all records in their organization
CREATE POLICY "Managers can read all availability"
    ON availability
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_manager = true
            AND profiles.organization_id = (
                SELECT organization_id FROM profiles WHERE id = availability.employee_id
            )
        )
    );

CREATE POLICY "Managers can read all preferences"
    ON shift_preferences
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_manager = true
            AND profiles.organization_id = (
                SELECT organization_id FROM profiles WHERE id = shift_preferences.employee_id
            )
        )
    );

CREATE POLICY "Managers can read all constraints"
    ON employee_constraints
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_manager = true
            AND profiles.organization_id = (
                SELECT organization_id FROM profiles WHERE id = employee_constraints.employee_id
            )
        )
    );

CREATE POLICY "Managers can manage assignments in their organization"
    ON assignments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_manager = true
            AND profiles.organization_id = assignments.organization_id
        )
    );

-- Managers can manage schedule versions in their organization
CREATE POLICY "Managers can manage schedule versions"
    ON schedule_versions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_manager = true
            AND profiles.organization_id = schedule_versions.organization_id
        )
    );

-- Managers can track schedule changes
CREATE POLICY "Managers can track schedule changes"
    ON schedule_changes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_manager = true
            AND profiles.organization_id = (
                SELECT organization_id FROM schedule_versions
                WHERE id = schedule_changes.schedule_version_id
            )
        )
    );

-- Employees can view published schedules
CREATE POLICY "Employees can view published schedules"
    ON schedule_versions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.organization_id = schedule_versions.organization_id
            AND schedule_versions.status = 'published'
        )
    );

-- Users can read their own notifications
CREATE POLICY "Users can read their own notifications"
    ON notifications
    FOR SELECT
    USING (auth.uid() = user_id);

-- Function to create notifications for schedule changes
CREATE OR REPLACE FUNCTION notify_schedule_change()
RETURNS TRIGGER AS $$
DECLARE
    org_id UUID;
    schedule_week DATE;
    affected_user_id UUID;
    notification_title TEXT;
    notification_message TEXT;
    notification_link TEXT;
BEGIN
    -- Get organization ID and week from schedule version
    SELECT organization_id, week_start
    INTO org_id, schedule_week
    FROM schedule_versions
    WHERE id = NEW.schedule_version_id;

    -- Set notification details based on change type
    CASE NEW.change_type
        WHEN 'added' THEN
            affected_user_id := NEW.new_employee_id;
            notification_title := 'New Shift Assignment';
            notification_message := 'You have been assigned a new shift for the week of ' || schedule_week;
            notification_link := '/dashboard/schedule';
        WHEN 'removed' THEN
            affected_user_id := NEW.previous_employee_id;
            notification_title := 'Shift Removed';
            notification_message := 'A shift has been removed from your schedule for the week of ' || schedule_week;
            notification_link := '/dashboard/schedule';
        WHEN 'modified' THEN
            -- Notify both previous and new employees
            IF NEW.previous_employee_id IS NOT NULL THEN
                INSERT INTO notifications (
                    user_id,
                    organization_id,
                    type,
                    title,
                    message,
                    link
                ) VALUES (
                    NEW.previous_employee_id,
                    org_id,
                    'assignment_changed',
                    'Shift Reassigned',
                    'Your shift for the week of ' || schedule_week || ' has been reassigned',
                    '/dashboard/schedule'
                );
            END IF;
            
            affected_user_id := NEW.new_employee_id;
            notification_title := 'New Shift Assignment';
            notification_message := 'You have been assigned a shift for the week of ' || schedule_week;
            notification_link := '/dashboard/schedule';
    END CASE;

    -- Create notification for the affected user
    IF affected_user_id IS NOT NULL THEN
        INSERT INTO notifications (
            user_id,
            organization_id,
            type,
            title,
            message,
            link
        ) VALUES (
            affected_user_id,
            org_id,
            CASE NEW.change_type
                WHEN 'added' THEN 'shift_added'
                WHEN 'removed' THEN 'shift_removed'
                ELSE 'assignment_changed'
            END,
            notification_title,
            notification_message,
            notification_link
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for schedule changes
CREATE TRIGGER schedule_change_notification
    AFTER INSERT ON schedule_changes
    FOR EACH ROW
    EXECUTE FUNCTION notify_schedule_change();

-- Function to notify on schedule status changes
CREATE OR REPLACE FUNCTION notify_schedule_status_change()
RETURNS TRIGGER AS $$
DECLARE
    org_id UUID;
    affected_users UUID[];
BEGIN
    org_id := NEW.organization_id;

    -- Get all employees in the organization
    SELECT ARRAY_AGG(id)
    INTO affected_users
    FROM profiles
    WHERE organization_id = org_id;

    -- Create notifications based on status change
    IF NEW.status = 'published' AND OLD.status != 'published' THEN
        -- Notify all employees about published schedule
        INSERT INTO notifications (
            user_id,
            organization_id,
            type,
            title,
            message,
            link
        )
        SELECT
            user_id,
            org_id,
            'schedule_published',
            'New Schedule Published',
            'The schedule for the week of ' || NEW.week_start || ' has been published',
            '/dashboard/schedule'
        FROM unnest(affected_users) AS user_id;
    ELSIF NEW.status = 'review' AND OLD.status != 'review' THEN
        -- Notify managers about schedule ready for review
        INSERT INTO notifications (
            user_id,
            organization_id,
            type,
            title,
            message,
            link
        )
        SELECT
            id,
            org_id,
            'schedule_review',
            'Schedule Ready for Review',
            'A new schedule version for the week of ' || NEW.week_start || ' needs review',
            '/manager/schedule'
        FROM profiles
        WHERE organization_id = org_id
        AND is_manager = true;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for schedule status changes
CREATE TRIGGER schedule_status_notification
    AFTER UPDATE OF status ON schedule_versions
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION notify_schedule_status_change();
