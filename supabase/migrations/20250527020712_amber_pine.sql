/*
  # Initial Schema Setup
  
  1. New Tables
    - rooms (for game sessions)
    - profiles (extended user data)
    - user_stats (player statistics)
    - sessions (active game sessions)
    
  2. Security
    - Enable RLS on all tables
    
  3. Triggers
    - Update last seen timestamp
*/

-- Create rooms table first since it's referenced by sessions
CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'open',
  current_narrative_state text,
  genre_tag text NOT NULL,
  created_at timestamptz DEFAULT now(),
  host_id uuid NOT NULL,
  CONSTRAINT valid_status CHECK (status IN ('open', 'in_progress', 'closed', 'abandoned'))
);

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
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

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