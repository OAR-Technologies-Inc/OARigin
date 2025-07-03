import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Supabase Config Check:');
console.log('URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('Key:', supabaseAnonKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Fix for local development - disable email confirmation for dev
    ...(import.meta.env.DEV && {
      flowType: 'pkce'
    })
  }
});

// Test connection on initialization
supabase.from('profiles').select('count').limit(1)
  .then(({ error }) => {
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
    } else {
      console.log('✅ Supabase connected successfully');
    }
  });

// Authentication functions
export const signUpUser = async (email: string, password: string, username: string) => {
  console.log('🔐 Attempting signup for:', email);
  
  try {
    // Validate inputs
    if (!email || !password || !username) {
      throw new Error('Email, password, and username are required');
    }
    
    if (username.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }

    // Clean username
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '').substring(0, 20);
    if (cleanUsername.length < 3) {
      throw new Error('Username must contain at least 3 valid characters (letters, numbers, underscore)');
    }

    // Check if username is already taken
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', cleanUsername)
      .single();
    
    if (existingProfile) {
      throw new Error('Username is already taken. Please choose a different one.');
    }

    // Sign up the user with email confirmation disabled in dev
    const signUpOptions: any = {
      email,
      password,
      options: {
        data: {
          username: cleanUsername,
        },
      },
    };

    // In development, disable email confirmation
    if (import.meta.env.DEV) {
      signUpOptions.options.emailRedirectTo = window.location.origin;
    }

    const { data, error } = await supabase.auth.signUp(signUpOptions);
    
    if (error) {
      console.error('❌ Signup error:', error);
      
      // Handle specific error cases
      if (error.message.includes('already registered')) {
        throw new Error('An account with this email already exists. Please try logging in instead.');
      }
      if (error.message.includes('rate_limit') || error.message.includes('rate limit')) {
        throw new Error('Too many requests. Please wait a moment before trying again.');
      }
      if (error.message.includes('invalid_credentials')) {
        throw new Error('Invalid email or password format.');
      }
      
      throw new Error(error.message || 'Account creation failed');
    }
    
    if (!data?.user) {
      throw new Error('Account creation failed. Please try again.');
    }

    console.log('✅ User created successfully:', data.user.id);

    // In development, the user should be automatically confirmed
    // In production, they'll need to check their email
    if (import.meta.env.DEV || data.user.email_confirmed_at) {
      // The profile should be created automatically by the trigger
      // But let's verify it exists
      let profile = null;
      let retries = 5;
      
      while (retries > 0 && !profile) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
        
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        
        if (!profileError && userProfile) {
          profile = userProfile;
          console.log('✅ Profile found:', profile.username);
          break;
        }
        
        retries--;
        console.log(`⏳ Profile not found, retrying... (${retries} attempts left)`);
      }

      // If profile still doesn't exist, create it manually
      if (!profile) {
        console.log('⚠️ Creating profile manually...');
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              username: cleanUsername,
              avatar_url: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${cleanUsername}`,
            },
          ])
          .select()
          .single();
        
        if (profileError) {
          console.error('❌ Manual profile creation failed:', profileError);
          // Don't fail the signup, user can still authenticate
        } else {
          profile = newProfile;
          console.log('✅ Profile created manually');
        }
      }
      
      return { data, profile, error: null };
    } else {
      // User needs to confirm email
      console.log('📧 Email confirmation required');
      return { 
        data, 
        profile: null, 
        error: new Error('Please check your email and click the confirmation link to complete your account setup.') 
      };
    }
    
  } catch (err) {
    console.error('❌ Signup error:', err);
    return { 
      data: null, 
      profile: null, 
      error: err instanceof Error ? err : new Error('Signup failed') 
    };
  }
};

export const signInUser = async (email: string, password: string) => {
  console.log('🔐 Attempting signin for:', email);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('❌ Signin error:', error);
      
      if (error.message.includes('invalid_credentials')) {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      }
      if (error.message.includes('rate_limit')) {
        throw new Error('Too many login attempts. Please wait a moment before trying again.');
      }
      if (error.message.includes('email_not_confirmed')) {
        throw new Error('Please check your email and click the confirmation link before logging in.');
      }
      
      throw new Error(error.message || 'Login failed');
    }

    if (!data?.user) {
      throw new Error('Login failed. Please try again.');
    }

    console.log('✅ User signed in successfully:', data.user.id);

    // Get user profile
    let profile = null;
    try {
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (profileError) {
        console.error('⚠️ Profile fetch error:', profileError);
        
        // If profile doesn't exist, create it
        if (profileError.code === 'PGRST116') {
          console.log('📝 Creating missing profile...');
          const username = data.user.email?.split('@')[0] || 'user';
          const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '').substring(0, 20);
          
          const { data: newProfile } = await supabase
            .from('profiles')
            .insert([
              {
                id: data.user.id,
                username: cleanUsername,
                avatar_url: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${cleanUsername}`,
              },
            ])
            .select()
            .single();
          profile = newProfile;
          console.log('✅ Profile created for existing user');
        }
      } else {
        profile = userProfile;
        console.log('✅ Profile loaded:', profile.username);
      }
    } catch (err) {
      console.error('❌ Profile operation failed:', err);
    }

    return { data, profile, error: null };
    
  } catch (err) {
    console.error('❌ Signin error:', err);
    return { 
      data: null, 
      profile: null, 
      error: err instanceof Error ? err : new Error('Login failed') 
    };
  }
};

export const signOutUser = async () => {
  console.log('🚪 Signing out user...');
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('❌ Signout error:', error);
  } else {
    console.log('✅ User signed out successfully');
  }
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
      status: 'open',
      game_mode: 'free_text'
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