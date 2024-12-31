

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."preference_level" AS ENUM (
    'preferred',
    'neutral',
    'avoid'
);


ALTER TYPE "public"."preference_level" OWNER TO "postgres";


CREATE TYPE "public"."shift_swap_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."shift_swap_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_shift_swap"("swap_request_id" "uuid", "new_status" "public"."shift_swap_status") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_swap_request shift_swap_requests;
  v_assignment schedule_assignments;
BEGIN
  -- Get the swap request
  SELECT * INTO v_swap_request
  FROM shift_swap_requests
  WHERE id = swap_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Swap request not found';
  END IF;

  IF v_swap_request.status != 'pending' THEN
    RAISE EXCEPTION 'Swap request is not pending';
  END IF;

  -- Update the swap request status
  UPDATE shift_swap_requests
  SET status = new_status,
      updated_at = NOW()
  WHERE id = swap_request_id;

  -- If approved, update the shift assignment
  IF new_status = 'approved' THEN
    -- Get the shift assignment
    SELECT * INTO v_assignment
    FROM schedule_assignments
    WHERE id = v_swap_request.shift_assignment_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Shift assignment not found';
    END IF;

    -- Update the employee assigned to the shift
    UPDATE schedule_assignments
    SET employee_id = v_swap_request.target_employee_id,
        updated_at = NOW()
    WHERE id = v_swap_request.shift_assignment_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."process_shift_swap"("swap_request_id" "uuid", "new_status" "public"."shift_swap_status") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_coverage_requirements_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_coverage_requirements_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_scheduling_constraints_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_scheduling_constraints_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_shift_preferences_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_shift_preferences_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."availability_patterns" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "day_of_week" integer NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    CONSTRAINT "availability_patterns_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6)))
);


ALTER TABLE "public"."availability_patterns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coverage_requirements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "required_staff" integer NOT NULL,
    "priority" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "coverage_requirements_required_staff_check" CHECK (("required_staff" >= 0)),
    CONSTRAINT "coverage_requirements_priority_check" CHECK (("priority" >= 1 AND "priority" <= 5))
);


ALTER TABLE "public"."coverage_requirements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_availability" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "day_of_week" integer NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "employee_availability_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6)))
);


ALTER TABLE "public"."employee_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "role" "text",
    "weekly_hours_limit" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['manager'::"text", 'employee'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedule_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "schedule_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "shift_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."schedule_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "schedules_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scheduling_constraints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "max_hours_per_day" integer NOT NULL,
    "min_hours_between_shifts" integer NOT NULL,
    "max_consecutive_days" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "scheduling_constraints_max_consecutive_days_check" CHECK ((("max_consecutive_days" >= 1) AND ("max_consecutive_days" <= 14))),
    CONSTRAINT "scheduling_constraints_max_hours_per_day_check" CHECK ((("max_hours_per_day" >= 1) AND ("max_hours_per_day" <= 24))),
    CONSTRAINT "scheduling_constraints_min_hours_between_shifts_check" CHECK ((("min_hours_between_shifts" >= 0) AND ("min_hours_between_shifts" <= 24)))
);


ALTER TABLE "public"."scheduling_constraints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shift_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "shift_id" "uuid" NOT NULL,
    "preference_level" "public"."preference_level" DEFAULT 'neutral'::"public"."preference_level" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."shift_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shift_swap_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requesting_employee_id" "uuid" NOT NULL,
    "target_employee_id" "uuid" NOT NULL,
    "shift_assignment_id" "uuid" NOT NULL,
    "status" "public"."shift_swap_status" DEFAULT 'pending'::"public"."shift_swap_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "different_employees" CHECK (("requesting_employee_id" <> "target_employee_id"))
);


ALTER TABLE "public"."shift_swap_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "role" "text" NOT NULL,
    "color" "text" DEFAULT '#808080'::text NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."shifts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."time_off_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "reason" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "time_off_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."time_off_requests" OWNER TO "postgres";


ALTER TABLE ONLY "public"."availability_patterns"
    ADD CONSTRAINT "availability_patterns_employee_id_day_of_week_key" UNIQUE ("employee_id", "day_of_week");



ALTER TABLE ONLY "public"."availability_patterns"
    ADD CONSTRAINT "availability_patterns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coverage_requirements"
    ADD CONSTRAINT "coverage_requirements_date_key" UNIQUE ("date");



ALTER TABLE ONLY "public"."coverage_requirements"
    ADD CONSTRAINT "coverage_requirements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_availability"
    ADD CONSTRAINT "employee_availability_employee_id_day_of_week_key" UNIQUE ("employee_id", "day_of_week");



ALTER TABLE ONLY "public"."employee_availability"
    ADD CONSTRAINT "employee_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedule_assignments"
    ADD CONSTRAINT "schedule_assignments_employee_id_date_shift_id_key" UNIQUE ("employee_id", "date", "shift_id");



ALTER TABLE ONLY "public"."schedule_assignments"
    ADD CONSTRAINT "schedule_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scheduling_constraints"
    ADD CONSTRAINT "scheduling_constraints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shift_preferences"
    ADD CONSTRAINT "shift_preferences_employee_id_shift_id_key" UNIQUE ("employee_id", "shift_id");



ALTER TABLE ONLY "public"."shift_preferences"
    ADD CONSTRAINT "shift_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shift_swap_requests"
    ADD CONSTRAINT "shift_swap_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_off_requests"
    ADD CONSTRAINT "time_off_requests_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE TRIGGER "coverage_requirements_updated_at" BEFORE UPDATE ON "public"."coverage_requirements" FOR EACH ROW EXECUTE FUNCTION "public"."update_coverage_requirements_updated_at"();



CREATE OR REPLACE TRIGGER "scheduling_constraints_updated_at" BEFORE UPDATE ON "public"."scheduling_constraints" FOR EACH ROW EXECUTE FUNCTION "public"."update_scheduling_constraints_updated_at"();



CREATE OR REPLACE TRIGGER "shift_preferences_updated_at" BEFORE UPDATE ON "public"."shift_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_shift_preferences_updated_at"();



CREATE OR REPLACE TRIGGER "update_availability_patterns_updated_at" BEFORE UPDATE ON "public"."availability_patterns" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_coverage_requirements_updated_at" BEFORE UPDATE ON "public"."coverage_requirements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employee_availability_updated_at" BEFORE UPDATE ON "public"."employee_availability" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_schedule_assignments_updated_at" BEFORE UPDATE ON "public"."schedule_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_schedules_updated_at" BEFORE UPDATE ON "public"."schedules" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_shifts_updated_at" BEFORE UPDATE ON "public"."shifts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_time_off_requests_updated_at" BEFORE UPDATE ON "public"."time_off_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."availability_patterns"
    ADD CONSTRAINT "availability_patterns_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_availability"
    ADD CONSTRAINT "employee_availability_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_assignments"
    ADD CONSTRAINT "schedule_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_assignments"
    ADD CONSTRAINT "schedule_assignments_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_assignments"
    ADD CONSTRAINT "schedule_assignments_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."shift_preferences"
    ADD CONSTRAINT "shift_preferences_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shift_preferences"
    ADD CONSTRAINT "shift_preferences_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shift_swap_requests"
    ADD CONSTRAINT "shift_swap_requests_requesting_employee_id_fkey" FOREIGN KEY ("requesting_employee_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."shift_swap_requests"
    ADD CONSTRAINT "shift_swap_requests_shift_assignment_id_fkey" FOREIGN KEY ("shift_assignment_id") REFERENCES "public"."schedule_assignments"("id");



ALTER TABLE ONLY "public"."shift_swap_requests"
    ADD CONSTRAINT "shift_swap_requests_target_employee_id_fkey" FOREIGN KEY ("target_employee_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."time_off_requests"
    ADD CONSTRAINT "time_off_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Coverage requirements are editable by managers" ON "public"."coverage_requirements" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'manager'::"text")))));



CREATE POLICY "Coverage requirements are viewable by authenticated users" ON "public"."coverage_requirements" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Employees can update their own preferences" ON "public"."shift_preferences" USING (("auth"."uid"() = "employee_id"));



CREATE POLICY "Employees can view published schedules." ON "public"."schedules" FOR SELECT USING ((("status" = 'published'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'manager'::"text"))))));



CREATE POLICY "Managers can manage all preferences" ON "public"."shift_preferences" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'manager'::"text")))));



CREATE POLICY "Managers can manage schedules." ON "public"."schedules" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'manager'::"text")))));



CREATE POLICY "Managers can view all shifts." ON "public"."shifts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'manager'::"text")))));



CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Scheduling constraints are editable by managers" ON "public"."scheduling_constraints" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'manager'::"text")))));



CREATE POLICY "Scheduling constraints are viewable by authenticated users" ON "public"."scheduling_constraints" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Shift preferences are viewable by authenticated users" ON "public"."shift_preferences" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can delete their own availability patterns" ON "public"."availability_patterns" FOR DELETE USING (("auth"."uid"() = "employee_id"));



CREATE POLICY "Users can insert their own availability patterns" ON "public"."availability_patterns" FOR INSERT WITH CHECK (("auth"."uid"() = "employee_id"));



CREATE POLICY "Users can update their own availability patterns" ON "public"."availability_patterns" FOR UPDATE USING (("auth"."uid"() = "employee_id")) WITH CHECK (("auth"."uid"() = "employee_id"));



CREATE POLICY "Users can update their own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own availability patterns" ON "public"."availability_patterns" FOR SELECT USING (("auth"."uid"() = "employee_id"));



ALTER TABLE "public"."availability_patterns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coverage_requirements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_availability" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schedule_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scheduling_constraints" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shift_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shifts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."time_off_requests" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."process_shift_swap"("swap_request_id" "uuid", "new_status" "public"."shift_swap_status") TO "anon";
GRANT ALL ON FUNCTION "public"."process_shift_swap"("swap_request_id" "uuid", "new_status" "public"."shift_swap_status") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_shift_swap"("swap_request_id" "uuid", "new_status" "public"."shift_swap_status") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_coverage_requirements_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_coverage_requirements_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_coverage_requirements_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_scheduling_constraints_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_scheduling_constraints_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_scheduling_constraints_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_shift_preferences_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_shift_preferences_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_shift_preferences_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."availability_patterns" TO "anon";
GRANT ALL ON TABLE "public"."availability_patterns" TO "authenticated";
GRANT ALL ON TABLE "public"."availability_patterns" TO "service_role";



GRANT ALL ON TABLE "public"."coverage_requirements" TO "anon";
GRANT ALL ON TABLE "public"."coverage_requirements" TO "authenticated";
GRANT ALL ON TABLE "public"."coverage_requirements" TO "service_role";



GRANT ALL ON TABLE "public"."employee_availability" TO "anon";
GRANT ALL ON TABLE "public"."employee_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_availability" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."schedule_assignments" TO "anon";
GRANT ALL ON TABLE "public"."schedule_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."schedule_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."schedules" TO "anon";
GRANT ALL ON TABLE "public"."schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."schedules" TO "service_role";



GRANT ALL ON TABLE "public"."scheduling_constraints" TO "anon";
GRANT ALL ON TABLE "public"."scheduling_constraints" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduling_constraints" TO "service_role";



GRANT ALL ON TABLE "public"."shift_preferences" TO "anon";
GRANT ALL ON TABLE "public"."shift_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."shift_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."shift_swap_requests" TO "anon";
GRANT ALL ON TABLE "public"."shift_swap_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."shift_swap_requests" TO "service_role";



GRANT ALL ON TABLE "public"."shifts" TO "anon";
GRANT ALL ON TABLE "public"."shifts" TO "authenticated";
GRANT ALL ON TABLE "public"."shifts" TO "service_role";



GRANT ALL ON TABLE "public"."time_off_requests" TO "anon";
GRANT ALL ON TABLE "public"."time_off_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."time_off_requests" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
