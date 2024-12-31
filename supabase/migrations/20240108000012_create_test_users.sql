-- Create test users in auth.users table
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmed_at)
VALUES
  ('87f08de9-b3c7-4c7e-b883-a4751a7f4bbb', 'exampleemail1@gmail.com', '$2a$10$abcdefghijklmnopqrstuvwxyz123456', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, NOW()),
  ('7460e94b-447d-4548-9518-7d5a50657ce5', 'exampleemail2@gmail.com', '$2a$10$abcdefghijklmnopqrstuvwxyz123456', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, NOW()),
  ('39800581-778d-4138-9742-d4d3d246e1d5', 'exampleemail3@gmail.com', '$2a$10$abcdefghijklmnopqrstuvwxyz123456', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Note: For testing purposes, we're only creating 3 users initially.
-- In production, users should be created through proper auth flows.
-- The password hash is a dummy value and these accounts won't be actually usable for login.

-- Create corresponding identities
INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT 
  id,
  id,
  json_build_object('sub', id::text, 'email', email),
  'email',
  NOW(),
  NOW(),
  NOW()
FROM auth.users
WHERE id IN (
  '87f08de9-b3c7-4c7e-b883-a4751a7f4bbb',
  '7460e94b-447d-4548-9518-7d5a50657ce5',
  '39800581-778d-4138-9742-d4d3d246e1d5'
)
ON CONFLICT (id) DO NOTHING; 