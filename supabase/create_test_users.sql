BEGIN;

-- Delete existing test user if exists
DELETE FROM auth.users WHERE email = 'test@example.com' OR id = '7460e94b-447d-4548-9518-7d5a50657ce5';

-- Also delete from identities table
DELETE FROM auth.identities WHERE id = '7460e94b-447d-4548-9518-7d5a50657ce5';

-- Also delete from profiles table
DELETE FROM public.profiles WHERE id = '7460e94b-447d-4548-9518-7d5a50657ce5';

-- Create test user with raw password
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '7460e94b-447d-4548-9518-7d5a50657ce5',
  'authenticated',
  'authenticated',
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Create corresponding identity
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '7460e94b-447d-4548-9518-7d5a50657ce5',
  '7460e94b-447d-4548-9518-7d5a50657ce5',
  jsonb_build_object(
    'sub', '7460e94b-447d-4548-9518-7d5a50657ce5',
    'email', 'test@example.com'
  ),
  'email',
  'test@example.com',
  NOW(),
  NOW(),
  NOW()
);

-- Create profile for the test user
INSERT INTO public.profiles (
  id,
  first_name,
  last_name,
  role,
  weekly_hours_limit,
  created_at,
  updated_at
) VALUES (
  '7460e94b-447d-4548-9518-7d5a50657ce5',
  'Test',
  'User',
  'employee',
  40,
  NOW(),
  NOW()
);

COMMIT; 