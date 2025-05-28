/*
  # Enhanced User System Migration

  1. New Tables
    - `profiles`: Extended user profile information
    - `user_stats`: User gameplay statistics
    - `sessions`: Active user sessions tracking

  2. Security
    - Enable RLS on all tables
    - Add policies for user data access
    - Add policies for stats management
    - Add policies for session management

  3. Automation
    - Add trigger for updating last seen timestamp
    - Add function for handling user activity
*/

-- Create enhanced users table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  username text NOT NULL UNIQUE,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_seen_at timestamptz,
  titles text[] DEFAULT ARRAY[]::text[],
  games_completed integer DEFAULT 0,
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Create user stats table
CREATE TABLE IF NOT EXISTS public.user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  genre text NOT NULL,
  stories_completed integer DEFAULT 0,
  decisions_made integer DEFAULT 0,
  consensus_rate decimal DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  room_id uuid REFERENCES public.rooms(id) NOT NULL,
  last_active_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Profiles policies
  DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
  
  -- User stats policies
  DROP POLICY IF EXISTS "Users can read their own stats" ON public.user_stats;
  DROP POLICY IF EXISTS "System can update user stats" ON public.user_stats;
  
  -- Sessions policies
  DROP POLICY IF EXISTS "Users can read their active sessions" ON public.sessions;
  DROP POLICY IF EXISTS "Users can manage their sessions" ON public.sessions;
END $$;

-- Profiles policies
CREATE POLICY "Users can read their own profile"
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

-- User stats policies
CREATE POLICY "Users can read their own stats"
  ON public.user_stats
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can update user stats"
  ON public.user_stats
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Sessions policies
CREATE POLICY "Users can read their active sessions"
  ON public.sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND is_active = true);

CREATE POLICY "Users can manage their sessions"
  ON public.sessions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS on_session_active ON public.sessions;
DROP FUNCTION IF EXISTS public.handle_user_active();

-- Function to update last seen
CREATE OR REPLACE FUNCTION public.handle_user_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET last_seen_at = now(),
      updated_at = now()
  WHERE id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for updating last seen
CREATE TRIGGER on_session_active
  AFTER UPDATE OF last_active_at ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_active();