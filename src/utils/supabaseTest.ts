// Test Supabase connection and diagnose issues
import { supabase } from '../lib/supabase';

export const testSupabaseConnection = async () => {
  console.log('🔍 Testing Supabase Connection...');
  
  try {
    // Test 1: Basic connection
    const { error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      console.error('❌ Connection test failed:', error);
      return false;
    }
    console.log('✅ Basic connection successful');

    // Test 2: Check auth status
    const { data: { session } } = await supabase.auth.getSession();
    console.log('🔐 Current session:', session ? 'Active' : 'None');

    // Test 3: Check RLS policies
    const { error: policyError } = await supabase
      .rpc('get_policies_for_table', { table_name: 'profiles' })
      .catch(() => ({ error: 'RPC not available' }));
    
    console.log('📋 RLS Policies check:', policyError ? 'Failed' : 'Success');

    return true;
  } catch (err) {
    console.error('❌ Connection test error:', err);
    return false;
  }
};

// Call this function to test
if (typeof window !== 'undefined') {
  testSupabaseConnection();
}