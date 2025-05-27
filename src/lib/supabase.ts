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
  
  if (error) return { data: null, error };
  
  // Refresh session to ensure it's available
  const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession();
  if (sessionError || !sessionData.session) {
    return { data: null, error: new Error('Failed to authenticate session after signup') };
  }
  
  return { data, error: null };
};

export const signInUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) return { data: null, error };

  // Refresh session to ensure it's available
  const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession();
  if (sessionError || !sessionData.session) {
    return { data: null, error: new Error('Failed to authenticate session after login') };
  }

  return { data, error: null };
};

export const signOutUser = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// Profile functions
export const getProfile = async (userId: string) => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session || session.user.id !== userId) {
    return { data: null, error: new Error('Unauthorized access') };
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
    .eq('id', userId);
  
  return { data, error };
};