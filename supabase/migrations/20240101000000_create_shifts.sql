create table if not exists public.shifts (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  start_time time not null,
  end_time time not null,
  duration_hours numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.shifts enable row level security;

-- Create policies
create policy "Users can view all shifts"
  on public.shifts for select
  to authenticated
  using (true);

create policy "Only managers can insert shifts"
  on public.shifts for insert
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
      and role = 'manager'
    )
  );

create policy "Only managers can update shifts"
  on public.shifts for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
      and role = 'manager'
    )
  );

create policy "Only managers can delete shifts"
  on public.shifts for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
      and role = 'manager'
    )
  );

-- Create function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- Create trigger for updated_at
create trigger handle_shifts_updated_at
  before update on public.shifts
  for each row
  execute function public.handle_updated_at(); 