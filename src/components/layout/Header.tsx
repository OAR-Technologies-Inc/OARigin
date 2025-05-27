import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGameStore } from '../../store';
import { LogOut } from 'lucide-react';
import Logo from '../ui/Logo';
import Button from '../ui/Button';
import AuthModal from '../auth/AuthModal';
import { signOutUser } from '../../lib/supabase';

const Header: React.FC = () => {
  const { currentUser: user, setUser, setAuthenticated } = useGameStore();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
    setAuthenticated(false);
  };

  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
  };
  
  return (
    <header className="border-b border-gray-800 bg-black/90 backdrop-blur-sm py-2 px-4 fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <Logo />
        </Link>
        
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="text-sm font-mono hidden md:block">
                <span className="text-gray-400">User: </span>
                <span className="text-green-500">{user.username}</span>
              </div>
              <img
                src={user.avatar}
                alt={user.username}
                className="w-8 h-8 rounded-full border border-green-500/50"
              />
              <Button 
                variant="ghost" 
                size="sm" 
                icon={<LogOut size={16} />}
                onClick={handleSignOut}
              >
                Logout
              </Button>
            </div>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsAuthModalOpen(true)}
            >
              Login
            </Button>
          )}
        </div>
      </div>
      
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </header>
  );
};

export default Header;