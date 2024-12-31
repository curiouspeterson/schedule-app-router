-- Add color field to shifts table
ALTER TABLE "public"."shifts"
ADD COLUMN IF NOT EXISTS "color" text DEFAULT '#808080'::text NOT NULL;

-- Add priority field to coverage_requirements table
ALTER TABLE "public"."coverage_requirements"
ADD COLUMN IF NOT EXISTS "priority" integer DEFAULT 1 NOT NULL;

-- Add constraint for priority range
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'coverage_requirements_priority_check'
    ) THEN
        ALTER TABLE "public"."coverage_requirements"
        ADD CONSTRAINT "coverage_requirements_priority_check" 
        CHECK (priority >= 1 AND priority <= 5);
    END IF;
END $$;

-- Add description field to time_off_requests table
ALTER TABLE "public"."time_off_requests"
ADD COLUMN IF NOT EXISTS "description" text; 