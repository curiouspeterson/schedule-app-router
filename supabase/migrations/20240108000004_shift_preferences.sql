-- Create enum type for preference levels
CREATE TYPE preference_level AS ENUM ('preferred', 'neutral', 'avoid');

-- Create shift preferences table
CREATE TABLE IF NOT EXISTS shift_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE NOT NULL,
    preference preference_level NOT NULL DEFAULT 'neutral',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(employee_id, shift_id)
);

-- Enable RLS
ALTER TABLE shift_preferences ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
CREATE TRIGGER update_shift_preferences_updated_at
    BEFORE UPDATE ON shift_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create policies for shift preferences
CREATE POLICY "Users can view their own shift preferences"
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