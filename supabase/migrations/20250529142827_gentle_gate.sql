-- Drop existing policies, functions, and triggers to avoid conflicts
DROP FUNCTION IF EXISTS handle_new_user CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP TRIGGER IF EXISTS on_session_active ON public.sessions;

-- Explicitly drop known policies as a fallback
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

DROP POLICY IF EXISTS "Users can create their own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can view their own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can read their own stats" ON user_stats;
DROP POLICY IF EXISTS "System can update user stats" ON user_stats;

DROP POLICY IF EXISTS "Users can create their own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can view their own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can read their active sessions" ON sessions;
DROP POLICY IF EXISTS "Users can manage their sessions" ON sessions;

DROP POLICY IF EXISTS "Users can create their own transcripts" ON transcripts;
DROP POLICY IF EXISTS "Users can view their own transcripts" ON transcripts;

DROP POLICY IF EXISTS "Users can view open rooms" ON rooms;
DROP POLICY IF EXISTS "Hosts can manage their rooms" ON rooms;

-- Drop all existing policies on relevant tables using a cursor as a secondary measure
DO $$ 
DECLARE
  policy_rec RECORD;
BEGIN
  -- Drop policies on profiles table
  FOR policy_rec IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', policy_rec.policyname);
  END LOOP;

  -- Drop policies on user_stats table
  FOR policy_rec IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_stats'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_stats', policy_rec.policyname);
  END LOOP;

  -- Drop policies on sessions table
  FOR policy_rec IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'sessions'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON sessions', policy_rec.policyname);
  END LOOP;

  -- Drop policies on transcripts table
  FOR policy_rec IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'transcripts'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON transcripts', policy_rec.policyname);
  END LOOP;

  -- Drop policies on rooms table
  FOR policy_rec IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'rooms'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON rooms', policy_rec.policyname);
  END LOOP;
END $$;

-- Create transcripts table if it doesn't exist (other tables are created in File 1)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'transcripts'
  ) THEN
    CREATE TABLE transcripts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      room_id TEXT NOT NULL,
      story_text TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  END IF;
END $$;

-- Add foreign key constraints for dependent tables (idempotent creation)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'user_stats_user_id_fkey' 
    AND conrelid = 'user_stats'::regclass
  ) THEN
    ALTER TABLE user_stats
    ADD CONSTRAINT user_stats_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'sessions_user_id_fkey' 
    AND conrelid = 'sessions'::regclass
  ) THEN
    ALTER TABLE sessions
    ADD CONSTRAINT sessions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'sessions_room_id_fkey' 
    AND conrelid = 'sessions'::regclass
  ) THEN
    ALTER TABLE sessions
    ADD CONSTRAINT sessions_room_id_fkey
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'transcripts_user_id_fkey' 
    AND conrelid = 'transcripts'::regclass
  ) THEN
    ALTER TABLE transcripts
    ADD CONSTRAINT transcripts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles (username);
CREATE INDEX IF NOT EXISTS profiles_created_at_idx ON profiles (created_at);
CREATE INDEX IF NOT EXISTS user_stats_user_id_idx ON user_stats (user_id);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_room_id_idx ON sessions (room_id);
CREATE INDEX IF NOT EXISTS transcripts_user_id_idx ON transcripts (user_id);

-- Enable RLS on transcripts table (other tables are enabled in File 1)
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

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

-- RLS policies for transcripts
CREATE POLICY "Users can create their own transcripts"
  ON public.transcripts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own transcripts"
  ON public.transcripts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON public.user_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS on_session_active ON public.sessions;

CREATE TRIGGER on_session_active
  AFTER UPDATE OF last_active_at ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_active();