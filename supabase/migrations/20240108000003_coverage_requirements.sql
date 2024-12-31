-- Create coverage requirements table
CREATE TABLE IF NOT EXISTS coverage_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6) NOT NULL,
    min_staff INTEGER NOT NULL CHECK (min_staff >= 0),
    max_staff INTEGER CHECK (max_staff >= min_staff),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(organization_id, shift_id, day_of_week)
);

-- Enable RLS
ALTER TABLE coverage_requirements ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
CREATE TRIGGER update_coverage_requirements_updated_at
    BEFORE UPDATE ON coverage_requirements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create policies for coverage requirements
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