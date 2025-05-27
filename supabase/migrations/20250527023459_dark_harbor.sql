/*
  # Add insert policy for profiles table
  
  1. Security Changes
    - Add policy to allow users to insert their own profile
    - Policy ensures users can only create a profile with their own ID
*/

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);