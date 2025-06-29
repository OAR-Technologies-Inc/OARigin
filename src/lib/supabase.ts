import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Authentication functions
export const signUpUser = async (email: string, password: string, username: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
      },
    },
  });
  
  if (error) return { data: null, profile: null, error };
  
  if (!data?.user) return { data: null, profile: null, error: new Error('User creation failed') };

  // Create profile after successful signup
  let profile = null;
  try {
    const { data: newProfile, error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: data.user.id,
          username,
          avatar_url: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`,
        },
      ])
      .select()
      .single();
    
    if (profileError) {
      console.error('Profile creation error:', profileError);
    } else {
      profile = newProfile;
    }
  } catch (err) {
    console.error('Profile creation failed:', err);
  }
  
  return { data, profile, error: null };
};

export const signInUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) return { data: null, profile: null, error };

  if (!data?.user) return { data: null, profile: null, error: new Error('Login failed') };

  // Get user profile
  let profile = null;
  try {
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    if (profileError) {
      console.error('Profile fetch error:', profileError);
    } else {
      profile = userProfile;
    }
  } catch (err) {
    console.error('Profile fetch failed:', err);
  }

  return { data, profile, error: null };
};

export const signOutUser = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// Profile functions
export const getProfile = async (userId: string) => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    return { data: null, error: new Error('No active session') };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  return { data, error };
};

export const updateProfile = async (userId: string, updates: any) => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session || session.user.id !== userId) {
    return { data: null, error: new Error('Unauthorized access') };
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
  return { data, error };
};

// Room functions
export const createGameRoom = async (hostId: string, genre: string, isPublic: boolean = false) => {
  const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  const { data, error } = await supabase
    .from('rooms')
    .insert({
      code: roomCode,
      genre_tag: genre,
      host_id: hostId,
      is_public: isPublic,
      status: 'open'
    })
    .select()
    .single();
    
  return { data, error };
};

export const joinGameRoom = async (userId: string, roomCode: string) => {
  // First check if room exists and is open
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', roomCode)
    .eq('status', 'open')
    .single();
    
  if (roomError || !room) {
    return { data: null, error: new Error('Room not found or not available') };
  }
  
  // Create session for user
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      room_id: room.id,
      is_active: true
    })
    .select()
    .single();
    
  if (sessionError) {
    return { data: null, error: sessionError };
  }
  
  return { data: { room, session }, error: null };
};

// Session functions
export const getUserActiveSessions = async (userId: string) => {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      *,
      rooms!inner(*)
    `)
    .eq('user_id', userId)
    .eq('is_active', true);
    
  return { data, error };
};

export const updateSessionActivity = async (sessionId: string) => {
  const { data, error } = await supabase
    .from('sessions')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', sessionId)
    .select()
    .single();
    
  return { data, error };
};

// Transcript functions
export const saveTranscript = async (userId: string, roomId: string, storyText: string) => {
  const { data, error } = await supabase
    .from('transcripts')
    .insert({
      user_id: userId,
      room_id: roomId,
      story_text: storyText
    })
    .select()
    .single();
    
  return { data, error };
};

export const getUserTranscripts = async (userId: string) => {
  const { data, error } = await supabase
    .from('transcripts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  return { data, error };
};