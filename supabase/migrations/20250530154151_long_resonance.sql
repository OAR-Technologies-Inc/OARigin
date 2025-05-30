/*
  # Add game_mode column to rooms table

  1. Changes
    - Add `game_mode` column to `rooms` table with TEXT type
    - Set default value to 'free_text'
    - Add constraint to validate game mode values

  2. Security
    - No changes to RLS policies needed
    - Column inherits existing table security
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rooms' AND column_name = 'game_mode'
  ) THEN
    ALTER TABLE rooms ADD COLUMN game_mode TEXT DEFAULT 'free_text';
    
    -- Add constraint to validate game mode values
    ALTER TABLE rooms ADD CONSTRAINT valid_game_mode 
      CHECK (game_mode IN ('free_text', 'multiple_choice'));
  END IF;
END $$;