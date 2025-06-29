/*
  # Fix waiting pool table and policies

  1. Tables
    - Fix waiting_pool table structure
    - Add proper foreign key constraints
    - Fix unique constraints

  2. Security
    - Add proper RLS policies for waiting_pool
    - Fix user access patterns

  3. Functions
    - Update match_players function to work correctly
*/

-- Drop existing waiting_pool table and recreate with proper structure
DROP TABLE IF EXISTS public.waiting_pool CASCADE;

CREATE TABLE public.waiting_pool (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    genre text NOT NULL,
    joined_at timestamptz DEFAULT now(),
    status text DEFAULT 'waiting',
    CONSTRAINT waiting_pool_status_check CHECK (status = ANY (ARRAY['waiting'::text, 'matched'::text, 'left'::text]))
);

-- Create unique index to prevent duplicate waiting entries per user
CREATE UNIQUE INDEX waiting_pool_user_id_key ON public.waiting_pool (user_id);

-- Enable RLS
ALTER TABLE public.waiting_pool ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for waiting_pool
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

-- Update match_players function
CREATE OR REPLACE FUNCTION public.match_players()
RETURNS TRIGGER AS $$
DECLARE
    matched_users uuid[];
    new_room_id uuid;
    room_code text;
    user_count integer;
BEGIN
    -- Count users waiting for the same genre
    SELECT COUNT(*) INTO user_count
    FROM public.waiting_pool
    WHERE genre = NEW.genre
    AND status = 'waiting';

    -- If we have at least 2 players, create a room
    IF user_count >= 2 THEN
        -- Get matching users (2-4 players with same genre)
        WITH matching_users AS (
            SELECT user_id
            FROM public.waiting_pool
            WHERE genre = NEW.genre
            AND status = 'waiting'
            ORDER BY joined_at
            LIMIT 4
        )
        SELECT array_agg(user_id) INTO matched_users
        FROM matching_users;

        -- Generate unique room code
        room_code := upper(substr(md5(random()::text), 1, 6));
        
        -- Create new room
        INSERT INTO public.rooms (code, genre_tag, host_id, is_public, status, game_mode)
        VALUES (room_code, NEW.genre, matched_users[1], true, 'open', 'free_text')
        RETURNING id INTO new_room_id;

        -- Update matched users status
        UPDATE public.waiting_pool
        SET status = 'matched'
        WHERE user_id = ANY(matched_users);

        -- Create sessions for all matched users
        INSERT INTO public.sessions (user_id, room_id, is_active)
        SELECT unnest(matched_users), new_room_id, true;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for matchmaking
DROP TRIGGER IF EXISTS trigger_match_players ON public.waiting_pool;
CREATE TRIGGER trigger_match_players
    AFTER INSERT ON public.waiting_pool
    FOR EACH ROW
    EXECUTE FUNCTION match_players();