import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Authentication functions
export const signUpUser = async (email: string, password: string, username: string) => {
  try {
    // First, sign up the user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });
    
    if (error) {
      console.error('Signup error:', error);
      return { data: null, profile: null, error };
    }
    
    if (!data?.user) {
      return { data: null, profile: null, error: new Error('User creation failed') };
    }

    // Wait for the auth user to be fully created
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create profile after successful signup
    let profile = null;
    try {
      // First, try to create the user record in the users table if it doesn't exist
      const { error: userError } = await supabase
        .from('users')
        .upsert([
          {
            id: data.user.id,
            email: data.user.email,
            data_privacy_preferences: {},
          },
        ], { 
          onConflict: 'id',
          ignoreDuplicates: true 
        });

      if (userError) {
        console.warn('User record creation warning:', userError);
        // Don't fail if user record already exists or can't be created
      }

      // Then create the profile
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .upsert([
          {
            id: data.user.id,
            username,
            avatar_url: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`,
          },
        ], { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select()
        .single();
      
      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Don't fail the entire signup if profile creation fails
        // The user can still be authenticated
        profile = {
          id: data.user.id,
          username,
          avatar_url: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      } else {
        profile = newProfile;
      }
    } catch (err) {
      console.error('Profile creation failed:', err);
      // Create a fallback profile object
      profile = {
        id: data.user.id,
        username,
        avatar_url: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
    
    return { data, profile, error: null };
  } catch (err) {
    console.error('Unexpected signup error:', err);
    return { data: null, profile: null, error: err instanceof Error ? err : new Error('Signup failed') };
  }
};

export const signInUser = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Signin error:', error);
      return { data: null, profile: null, error };
    }

    if (!data?.user) {
      return { data: null, profile: null, error: new Error('Login failed') };
    }

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
        // If profile doesn't exist, try to create it
        if (profileError.code === 'PGRST116') {
          const username = data.user.user_metadata?.username || data.user.email?.split('@')[0] || 'user';
          
          // Try to create user record first
          await supabase
            .from('users')
            .upsert([
              {
                id: data.user.id,
                email: data.user.email,
                data_privacy_preferences: {},
              },
            ], { 
              onConflict: 'id',
              ignoreDuplicates: true 
            });

          // Then create profile
          const { data: newProfile } = await supabase
            .from('profiles')
            .upsert([
              {
                id: data.user.id,
                username,
                avatar_url: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`,
              },
            ], { 
              onConflict: 'id',
              ignoreDuplicates: false 
            })
            .select()
            .single();
          profile = newProfile || {
            id: data.user.id,
            username,
            avatar_url: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
      } else {
        profile = userProfile;
      }
    } catch (err) {
      console.error('Profile fetch failed:', err);
      // Create fallback profile
      const username = data.user.user_metadata?.username || data.user.email?.split('@')[0] || 'user';
      profile = {
        id: data.user.id,
        username,
        avatar_url: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    return { data, profile, error: null };
  } catch (err) {
    console.error('Unexpected signin error:', err);
    return { data: null, profile: null, error: err instanceof Error ? err : new Error('Login failed') };
  }
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