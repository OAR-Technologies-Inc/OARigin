/*
  # Fix profiles table RLS policies

  1. Security Updates
    - Drop existing problematic policies
    - Create new policies with correct auth.uid() references
    - Ensure proper INSERT and SELECT permissions for authenticated users
    
  2. Policy Changes
    - Fix INSERT policy to use auth.uid() consistently
    - Fix SELECT policy to use auth.uid() consistently
    - Add UPDATE policy for profile modifications
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Create new policies with correct auth.uid() references
CREATE POLICY "Enable insert for authenticated users"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable select for users based on user_id"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Enable update for users based on user_id"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);