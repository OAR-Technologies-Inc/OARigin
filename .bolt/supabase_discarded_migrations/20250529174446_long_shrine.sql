/*
  # Initial Schema Setup
  
  1. New Tables
    - rooms (for game sessions)
    - profiles (extended user data)
    - user_stats (player statistics)
    - sessions (active game sessions)
    - waiting_pool (matchmaking)
    
  2. Security
    - Enable RLS on all tables
    
  3. Triggers
    - Update last seen timestamp
    - Match players automatically
*/

-- Create rooms table first since it's referenced by sessions
CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'open',
  current_narrative_state text,
  genre_tag text NOT NULL,
  is_public boolean DEFAULT false,
  max_players integer DEFAULT 4,
  min_players integer DEFAULT 2,
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

-- Create waiting pool table for matchmaking
CREATE TABLE IF NOT EXISTS public.waiting_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) NOT NULL UNIQUE,
  genre text NOT NULL,
  joined_at timestamptz DEFAULT now(),
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'left'))
);

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiting_pool ENABLE ROW LEVEL SECURITY;

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

-- Function to match players in waiting pool
CREATE OR REPLACE FUNCTION public.match_players()
RETURNS TRIGGER AS $$
DECLARE
  matched_users uuid[];
  new_room_id uuid;
  genre_to_match text;
BEGIN
  -- Only proceed if the new entry is in 'waiting' status
  IF NEW.status = 'waiting' THEN
    -- Get the genre we're matching for
    genre_to_match := NEW.genre;
    
    -- Find other waiting players with the same genre preference
    WITH waiting_players AS (
      SELECT user_id
      FROM public.waiting_pool
      WHERE status = 'waiting'
        AND genre = genre_to_match
      ORDER BY joined_at
      LIMIT 4
    )
    SELECT array_agg(user_id) INTO matched_users
    FROM waiting_players;
    
    -- If we have at least 2 players, create a room and match them
    IF array_length(matched_users, 1) >= 2 THEN
      -- Create new room
      INSERT INTO public.rooms (code, status, genre_tag, is_public, host_id)
      VALUES (
        substring(md5(random()::text) from 1 for 6),
        'open',
        genre_to_match,
        true,
        matched_users[1]
      )
      RETURNING id INTO new_room_id;
      
      -- Update matched players' status
      UPDATE public.waiting_pool
      SET status = 'matched'
      WHERE user_id = ANY(matched_users);
      
      -- Create sessions for all matched players
      INSERT INTO public.sessions (user_id, room_id)
      SELECT unnest(matched_users), new_room_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER on_session_active
  AFTER UPDATE OF last_active_at ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_active();

CREATE TRIGGER trigger_match_players
  AFTER INSERT ON public.waiting_pool
  FOR EACH ROW
  EXECUTE FUNCTION public.match_players();

-- RLS policies for rooms
CREATE POLICY "Users can view open rooms"
ON public.rooms
FOR SELECT
TO authenticated
USING (status = 'open' OR host_id = auth.uid());

CREATE POLICY "Hosts can manage their rooms"
ON public.rooms
FOR ALL
TO authenticated
USING (host_id = auth.uid());

-- RLS policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles
FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO public
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO public
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- RLS policies for user_stats
CREATE POLICY "Users can create their own stats"
ON public.user_stats
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own stats"
ON public.user_stats
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can update user stats"
ON public.user_stats
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policies for sessions
CREATE POLICY "Users can create their own sessions"
ON public.sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their sessions"
ON public.sessions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policies for waiting pool
CREATE POLICY "Users can insert themselves into waiting pool"
ON public.waiting_pool
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own status"
ON public.waiting_pool
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view waiting pool"
ON public.waiting_pool
FOR SELECT
TO authenticated
USING (true);