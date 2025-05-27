import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { signUpUser, signInUser } from '../../lib/supabase';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { useGameStore } from '../../store';
import { supabase } from '../../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { setUser, setAuthenticated } = useGameStore();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
  });

  useEffect(() => {
    let timer: number;
    if (cooldown > 0) {
      timer = window.setInterval(() => {
        setCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      if (isLogin) {
        const { data, profile, error } = await signInUser(formData.email, formData.password);
        
        if (error) throw error;
        if (!data?.user) throw new Error('Login failed. Please try again.');

        let userProfile = profile;
        if (!profile) {
          // Ensure session is set
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || !sessionData.session) {
            throw new Error('Failed to authenticate session. Please try logging in again.');
          }

          // If profile doesn't exist, create one
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert([
              {
                id: data.user.id,
                username: formData.email.split('@')[0],
                avatar_url: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${formData.email.split('@')[0]}`,
              },
            ])
            .select()
            .single();

          if (insertError) throw insertError;
          userProfile = newProfile;
        }

        // Update app state with user and profile data
        setUser({
          id: data.user.id,
          username: userProfile?.username || formData.email.split('@')[0],
          avatar: userProfile?.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${formData.email.split('@')[0]}`,
          oarWalletLinked: false,
          status: 'alive'
        });
        setAuthenticated(true);
      } else {
        if (cooldown > 0) {
          throw new Error(`Please wait ${cooldown} seconds before trying again`);
        }

        // Sign up the user
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              username: formData.username,
            },
          },
        });
        
        if (error) {
          if (error.message.includes('rate_limit')) {
            setCooldown(10);
          }
          throw error;
        }
        
        if (!data?.user) throw new Error('User creation failed. Please try again.');

        // Sign in the user to set the session
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (loginError || !loginData?.user) {
          throw new Error('Signup successful, but failed to set session. Please try logging in.');
        }

        // Ensure session is set
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          throw new Error('Failed to authenticate session. Please try logging in.');
        }

        // Create profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: loginData.user.id,
              username: formData.username,
              avatar_url: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${formData.username}`,
            },
          ])
          .select()
          .single();
        
        if (profileError) throw profileError;

        // Update app state with user and profile data
        setUser({
          id: loginData.user.id,
          username: formData.username,
          avatar: profileData?.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${formData.username}`,
          oarWalletLinked: false,
          status: 'alive'
        });
        setAuthenticated(true);
      }
      
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 pt-24 p-4 md:p-0">
      <Card className="w-full max-w-md">
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-mono font-bold text-green-500">
              {isLogin ? 'Login to OARigin' : 'Create Account'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            {!isLogin && (
              <Input
                label="Username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Choose a username"
                required
                minLength={3}
                fullWidth
              />
            )}
            
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter your email"
              required
              fullWidth
            />
            
            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter your password"
              required
              minLength={6}
              fullWidth
            />
            
            {error && (
              <div className="text-red-500 text-sm py-2">{error}</div>
            )}

            {cooldown > 0 && !isLogin && (
              <div className="text-yellow-500 text-sm py-2">
                Please wait {cooldown} seconds before trying again
              </div>
            )}
            
            <Button
              variant="primary"
              type="submit"
              isLoading={isLoading}
              disabled={!isLogin && cooldown > 0}
              fullWidth
              className="mt-4"
            >
              {isLogin ? 'Login' : 'Create Account'}
            </Button>
            
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-green-500 hover:text-green-400 text-sm"
              >
                {isLogin ? 'Need an account? Sign up' : 'Already have an account? Login'}
              </button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default AuthModal;