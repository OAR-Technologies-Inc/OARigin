-- Add dead_players column to game_state table
ALTER TABLE public.game_state 
ADD COLUMN IF NOT EXISTS dead_players text[] DEFAULT ARRAY[]::text[];

-- Comment explaining the column
COMMENT ON COLUMN public.game_state.dead_players IS 'Array of user IDs of players who have died in this game session';
