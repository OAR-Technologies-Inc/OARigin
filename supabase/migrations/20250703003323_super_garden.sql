/*
  # Fix Authentication and Profile Creation Issues
  
  1. Clean up conflicting policies
  2. Create proper RLS policies with consistent auth.uid() usage
  3. Add automatic profile creation trigger
  4. Ensure proper foreign key constraints
*/

-- First, drop ALL existing policies on profiles to start clean
DO $$ 
DECLARE
  policy_rec RECORD;
BEGIN
  FOR policy_rec IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', policy_rec.policyname);
  END LOOP;
END $$;

-- Ensure profiles table exists with correct structure
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles'
  ) THEN
    CREATE TABLE profiles (
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      username text NOT NULL,
      avatar_url text,
      created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
    );
  END IF;
END $$;

-- Add missing columns if they don't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username text;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT CURRENT_TIMESTAMP;

-- Make username NOT NULL if it isn't already
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'username' 
    AND is_nullable = 'YES'
  ) THEN
    -- First update any NULL usernames
    UPDATE profiles 
    SET username = 'user_' || substr(id::text, 1, 8) 
    WHERE username IS NULL;
    
    -- Then make it NOT NULL
    ALTER TABLE profiles 
    ALTER COLUMN username SET NOT NULL;
  END IF;
END $$;

-- Create unique constraint on username if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_username_key'
  ) THEN
    ALTER TABLE profiles 
    ADD CONSTRAINT profiles_username_key UNIQUE (username);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create new, clean RLS policies
CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  username_val text;
BEGIN
  -- Extract username from metadata or use email prefix
  username_val := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  
  -- Ensure username is unique by appending number if needed
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = username_val) LOOP
    username_val := username_val || '_' || floor(random() * 1000)::text;
  END LOOP;
  
  -- Insert profile
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    username_val,
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=' || username_val
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();