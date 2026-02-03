-- Seed default admin user: hammadmaqdoom1@gmail.com
-- Password: AdminChangeMe1! (change after first login)
-- This user is created as a profile and given a default workspace as owner (admin).
-- Token columns are set to '' so GoTrue does not 500 when scanning the row (NULL -> string scan error).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  admin_id UUID := 'a0000001-0000-4000-8000-000000000001';
  admin_email TEXT := 'hammadmaqdoom1@gmail.com';
  admin_password TEXT := 'AdminChangeMe1!';
  v_encrypted_pw TEXT := extensions.crypt(admin_password, extensions.gen_salt('bf'::text));
BEGIN
  -- 1. Insert the user into auth.users (idempotent)
  -- Include token columns as '' to avoid GoTrue 500 when loading user (NULL scan error)
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    phone_change,
    reauthentication_token
  ) VALUES (
    admin_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    admin_email,
    v_encrypted_pw,
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Hammad Maqdoom"}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Link identity so the user can sign in (idempotent)
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
    admin_id,
    admin_id,
    format('{"sub": "%s", "email": "%s"}', admin_id, admin_email)::jsonb,
    'email',
    admin_id::text,
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- 3. Ensure profile exists (trigger may have run; idempotent)
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (admin_id, admin_email, 'Admin')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;

  -- 4. Create default workspace with this user as owner (admin)
  INSERT INTO public.workspaces (id, name, slug, owner_id)
  VALUES (
    gen_random_uuid(),
    'Default',
    'default',
    admin_id
  )
  ON CONFLICT (slug) DO NOTHING;
END
$$;
