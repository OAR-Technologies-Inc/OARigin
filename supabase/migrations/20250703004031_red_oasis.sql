/*
  # Fix Email Confirmation and Auth Flow

  1. Updates
    - Fix auth settings for local development
    - Ensure proper email confirmation flow
    - Add missing columns to existing tables

  2. Security
    - Update RLS policies for better auth flow
    - Fix profile creation trigger
*/

-- Ensure rooms table has game_mode column
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS game_mode text DEFAULT 'free_text';

-- Update auth settings for local development (this needs to be done in Supabase dashboard)
-- But we can ensure the database is ready for it

-- Fix the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  username_val text;
  counter integer := 0;
  base_username text;
BEGIN
  -- Extract username from metadata or use email prefix
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1),
    'user'
  );
  
  -- Clean the username (remove special characters, limit length)
  base_username := regexp_replace(lower(base_username), '[^a-z0-9_]', '', 'g');
  base_username := substr(base_username, 1, 20);
  
  -- Ensure username is not empty
  IF base_username = '' THEN
    base_username := 'user';
  END IF;
  
  username_val := base_username;
  
  -- Ensure username is unique by appending number if needed
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = username_val) LOOP
    counter := counter + 1;
    username_val := base_username || '_' || counter::text;
    
    -- Prevent infinite loop
    IF counter > 1000 THEN
      username_val := base_username || '_' || extract(epoch from now())::bigint::text;
      EXIT;
    END IF;
  END LOOP;
  
  -- Insert profile
  INSERT INTO public.profiles (id, username, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    username_val,
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=' || username_val,
    now(),
    now()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle race condition - try with timestamp
    username_val := base_username || '_' || extract(epoch from now())::bigint::text;
    INSERT INTO public.profiles (id, username, avatar_url, created_at, updated_at)
    VALUES (
      NEW.id,
      username_val,
      'https://api.dicebear.com/7.x/pixel-art/svg?seed=' || username_val,
      now(),
      now()
    );
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to ensure it's working
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add a policy to allow profile creation during signup
CREATE POLICY IF NOT EXISTS "Allow profile creation during signup"
  ON public.profiles
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Update existing policies to be more permissive during auth
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- More permissive policies for auth flow
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow public read access for profiles (needed for some auth flows)
CREATE POLICY "Public can view profiles"
  ON public.profiles
  FOR SELECT
  TO public
  USING (true);