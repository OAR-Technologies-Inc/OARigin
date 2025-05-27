/*
  # Initial Schema Setup for OARigin

  1. New Tables
    - Enhanced users table with additional profile fields
    - user_stats for tracking player progress
    - sessions for managing active game sessions
    - transcripts for storing completed game stories

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Secure access patterns for game data
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