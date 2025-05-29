-- Add is_public column to rooms if it doesn't exist
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Create waiting pool table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.waiting_pool (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) NOT NULL,
    genre text NOT NULL,
    joined_at timestamptz DEFAULT now(),
    status text DEFAULT 'waiting',
    CONSTRAINT waiting_pool_status_check CHECK (status = ANY (ARRAY['waiting'::text, 'matched'::text, 'left'::text]))
);

-- Create unique index to prevent duplicate waiting entries
CREATE UNIQUE INDEX IF NOT EXISTS waiting_pool_user_id_key ON public.waiting_pool (user_id) WHERE (status = 'waiting');

-- Enable RLS on waiting_pool
ALTER TABLE public.waiting_pool ENABLE ROW LEVEL SECURITY;

-- Create match_players function if it doesn't exist
CREATE OR REPLACE FUNCTION public.match_players()
RETURNS TRIGGER AS $$
DECLARE
    matched_users uuid[];
    new_room_id uuid;
    room_code text;
BEGIN
    -- Find matching users (2-4 players with same genre)
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

    -- If we have at least 2 players, create a room
    IF array_length(matched_users, 1) >= 2 THEN
        -- Generate unique room code
        room_code := substr(md5(random()::text), 1, 6);
        
        -- Create new room
        INSERT INTO public.rooms (code, genre_tag, host_id, is_public, status)
        VALUES (room_code, NEW.genre, matched_users[1], true, 'open')
        RETURNING id INTO new_room_id;

        -- Update matched users status
        UPDATE public.waiting_pool
        SET status = 'matched'
        WHERE user_id = ANY(matched_users);

        -- Create sessions for all matched users
        INSERT INTO public.sessions (user_id, room_id)
        SELECT unnest(matched_users), new_room_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace trigger
DROP TRIGGER IF EXISTS trigger_match_players ON public.waiting_pool;
CREATE TRIGGER trigger_match_players
    AFTER INSERT ON public.waiting_pool
    FOR EACH ROW
    EXECUTE FUNCTION match_players();

-- Add RLS policies for waiting_pool
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