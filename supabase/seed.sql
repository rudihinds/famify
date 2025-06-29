-- Seed file for development test data
-- This file is executed when running `supabase start` or `supabase db reset`

-- Create test user in auth.users
-- Note: This approach is for local development only
-- In production, users should be created through Supabase Auth API

-- First, we need to create a test user
-- We'll use a workaround by creating a function with SECURITY DEFINER
-- to bypass the permission restrictions on auth.users

-- Create a temporary function to insert test user
CREATE OR REPLACE FUNCTION create_test_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Check if test user already exists
  SELECT id INTO test_user_id FROM auth.users WHERE email = 'test@famify.com';
  
  IF test_user_id IS NULL THEN
    -- Insert test user
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'test@famify.com',
      extensions.crypt('testpass123', extensions.gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{}',
      false,
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO test_user_id;
    
    -- Create profile for test user
    INSERT INTO public.profiles (id, created_at, updated_at)
    VALUES (test_user_id, now(), now());
    
    -- Create test children
    INSERT INTO public.children (id, parent_id, name, age, pin_hash, famcoin_balance, created_at, updated_at)
    VALUES 
      (gen_random_uuid(), test_user_id, 'Emma', 8, '1234', 100, now(), now()),
      (gen_random_uuid(), test_user_id, 'Liam', 10, '5678', 150, now(), now());
    
    RAISE NOTICE 'Test user created successfully with email: test@famify.com';
  ELSE
    RAISE NOTICE 'Test user already exists';
  END IF;
END;
$$;

-- Execute the function
SELECT create_test_user();

-- Drop the function after use
DROP FUNCTION create_test_user();

-- Seed task categories
INSERT INTO public.task_categories (id, name, icon, color, description, is_system)
VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Morning Routine', 'sun', '#FFA500', 'Daily morning activities', true),
  ('550e8400-e29b-41d4-a716-446655440002', 'School Prep', 'backpack', '#4169E1', 'Getting ready for school', true),
  ('550e8400-e29b-41d4-a716-446655440003', 'Chores', 'home', '#32CD32', 'Household responsibilities', true),
  ('550e8400-e29b-41d4-a716-446655440004', 'Personal Care', 'heart', '#FF69B4', 'Health and hygiene', true),
  ('550e8400-e29b-41d4-a716-446655440005', 'Learning', 'book', '#9370DB', 'Educational activities', true),
  ('550e8400-e29b-41d4-a716-446655440006', 'Bedtime', 'moon', '#1E90FF', 'Evening routine', true)
ON CONFLICT (id) DO NOTHING;

-- Seed task templates
INSERT INTO public.task_templates (name, description, category_id, photo_proof_required, effort_score, is_system)
VALUES
  -- Morning Routine
  ('Brush Teeth', 'Brush teeth for 2 minutes', '550e8400-e29b-41d4-a716-446655440001', false, 1, true),
  ('Make Bed', 'Tidy up bed with pillows arranged', '550e8400-e29b-41d4-a716-446655440001', true, 2, true),
  ('Get Dressed', 'Put on clothes for the day', '550e8400-e29b-41d4-a716-446655440001', false, 1, true),
  ('Eat Breakfast', 'Finish a healthy breakfast', '550e8400-e29b-41d4-a716-446655440001', false, 1, true),
  
  -- School Prep
  ('Pack Backpack', 'Organize school supplies and homework', '550e8400-e29b-41d4-a716-446655440002', false, 2, true),
  ('Prepare Lunch', 'Help make or pack lunch', '550e8400-e29b-41d4-a716-446655440002', false, 3, true),
  ('Check Homework', 'Ensure all homework is complete', '550e8400-e29b-41d4-a716-446655440002', false, 2, true),
  
  -- Chores
  ('Feed Pet', 'Give food and fresh water to pet', '550e8400-e29b-41d4-a716-446655440003', false, 2, true),
  ('Tidy Room', 'Pick up toys and organize belongings', '550e8400-e29b-41d4-a716-446655440003', true, 3, true),
  ('Take Out Trash', 'Empty bins and replace bags', '550e8400-e29b-41d4-a716-446655440003', false, 2, true),
  ('Set Table', 'Place dishes and utensils for meal', '550e8400-e29b-41d4-a716-446655440003', false, 2, true),
  ('Water Plants', 'Water indoor or outdoor plants', '550e8400-e29b-41d4-a716-446655440003', false, 1, true),
  
  -- Personal Care
  ('Shower/Bath', 'Take a shower or bath', '550e8400-e29b-41d4-a716-446655440004', false, 2, true),
  ('Wash Hands', 'Wash hands before meals', '550e8400-e29b-41d4-a716-446655440004', false, 1, true),
  ('Comb Hair', 'Brush and style hair', '550e8400-e29b-41d4-a716-446655440004', false, 1, true),
  
  -- Learning
  ('Reading Time', '20 minutes of reading', '550e8400-e29b-41d4-a716-446655440005', false, 3, true),
  ('Practice Instrument', 'Practice musical instrument', '550e8400-e29b-41d4-a716-446655440005', false, 4, true),
  ('Homework Time', 'Complete assigned homework', '550e8400-e29b-41d4-a716-446655440005', false, 4, true),
  
  -- Bedtime
  ('Pajamas On', 'Change into nightwear', '550e8400-e29b-41d4-a716-446655440006', false, 1, true),
  ('Brush Teeth (Night)', 'Brush teeth before bed', '550e8400-e29b-41d4-a716-446655440006', false, 1, true),
  ('Story Time', 'Read or listen to bedtime story', '550e8400-e29b-41d4-a716-446655440006', false, 2, true),
  ('Lights Out', 'Turn off lights and go to sleep', '550e8400-e29b-41d4-a716-446655440006', false, 1, true)
ON CONFLICT DO NOTHING;