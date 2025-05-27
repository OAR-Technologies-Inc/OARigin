import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  const checkSubscription = async (userId: string) => {
    const { data, error } = await supabase
      .from('game_subscriptions')
      .select('status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (error || !data) {
      setIsSubscribed(false);
      return false;
    }

    setIsSubscribed(true);
    return true;
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkSubscription(session.user.id);
      }
      setLoading(false);
    });
    
    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkSubscription(session.user.id);
      } else {
        setIsSubscribed(false);
      }
      setLoading(false);
    });
    
    return () => subscription.unsubscribe();
  }, []);
  
  const signOut = async () => {
    await supabase.auth.signOut();
  };
  
  return {
    user,
    loading,
    isSubscribed,
    checkSubscription,
    signOut,
  };
}