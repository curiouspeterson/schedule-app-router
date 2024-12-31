-- Create function to get upcoming shifts count per employee
create or replace function get_upcoming_shifts_count(p_current_date date)
returns table (
  employee_id uuid,
  count bigint
)
language plpgsql
security definer
as $$
begin
  return query
  select
    sa.employee_id,
    count(*)::bigint
  from schedule_assignments sa
  where sa.date >= p_current_date
  group by sa.employee_id;
end;
$$;

-- Create function to get pending time off count per employee
create or replace function get_pending_time_off_count(p_current_date date)
returns table (
  employee_id uuid,
  count bigint
)
language plpgsql
security definer
as $$
begin
  return query
  select
    tor.employee_id,
    count(*)::bigint
  from time_off_requests tor
  where tor.status = 'pending'
    and tor.start_date >= p_current_date
  group by tor.employee_id;
end;
$$;

-- Grant execute permissions to authenticated users
grant execute on function get_upcoming_shifts_count(date) to authenticated;
grant execute on function get_pending_time_off_count(date) to authenticated; 