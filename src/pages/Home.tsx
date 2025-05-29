import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogIn, UserCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useGameStore } from '../store';
import { GameGenre } from '../types';
import Logo from '../components/ui/Logo';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { 
    currentUser, 
    isAuthenticated, 
    generateTempUser, 
    createRoom, 
    joinRoom 
  } = useGameStore();
  
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<GameGenre>(GameGenre.FANTASY);
  
  const handleCreateRoom = async () => {
    if (!isAuthenticated) {
      if (!username.trim()) return;
      generateTempUser(username);
    }
    
    try {
      setIsCreating(true);
      await createRoom(selectedGenre, true);
      navigate('/lobby');
    } catch (error) {
      console.error('Failed to create room:', error);
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleJoinRoom = () => {
    if (!roomCode.trim()) return;
    
    if (!isAuthenticated) {
      if (!username.trim()) return;
      generateTempUser(username);
    }
    
    // In a real implementation, this would make an API call
    joinRoom(currentUser?.id || '', roomCode);
    navigate('/lobby');
  };
  
  return (
    <Layout>
      <div 
        className="min-h-screen flex items-center justify-center p-2 sm:p-4 bg-gradient-to-b from-gray-900 to-black"
      >
        <div className="w-full max-w-4xl">
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex justify-center mb-3 sm:mb-4">
              <Logo size="lg" className="drop-shadow-[0_0_8px_rgba(103,232,249,0.5)]" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold font-mono text-pink-400 mb-1 sm:mb-2 drop-shadow-[0_0_3px_rgba(244,114,182,0.3)]">
              <span className="text-cyan-300">Rewarding </span> Adventures
            </h1>
            <p className="text-base sm:text-xl text-gray-300 max-w-xl mx-auto font-mono">
              Embark on a cooperative text adventure with friends, guided by an AI Game Master
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            <Card 
              className="p-6 sm:p-8" 
              glowColor="pink"
              style={{ boxShadow: '0 0 8px rgba(244, 114, 182, 0.3)' }}
            >
              <h2 className="text-lg sm:text-xl font-mono font-bold text-pink-400 mb-3 sm:mb-4 flex items-center">
                <Plus size={18} className="mr-2" />
                Create New Adventure
              </h2>
              
              <div className="space-y-4 sm:space-y-6">
                {!isAuthenticated && (
                  <Input
                    label="Choose a Username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    fullWidth
                    className="font-mono text-cyan-300 border-cyan-300/50 focus:border-cyan-300 placeholder-gray-500 text-sm sm:text-base"
                  />
                )}
                
                <div>
                  <label className="block text-pink-400 font-mono text-xs sm:text-sm mb-1">
                    Select Genre
                  </label>
                  <select
                    className="font-mono bg-gray-800 border border-pink-400/50 rounded-md px-3 sm:px-4 py-1.5 sm:py-2 w-full text-pink-400 focus:border-pink-400 text-sm sm:text-base"
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value as GameGenre)}
                  >
                    {Object.values(GameGenre).map((genre) => (
                      <option key={genre} value={genre} className="text-pink-400 bg-gray-800">{genre}</option>
                    ))}
                  </select>
                </div>
                
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleCreateRoom}
                  isLoading={isCreating}
                  disabled={!isAuthenticated && !username.trim()}
                  className="bg-pink-500 hover:bg-pink-400 text-white border-pink-400/50 hover:border-pink-400 hover:shadow-[0_0_5px_rgba(244,114,182,0.5)] transition-all font-mono py-2 sm:py-3 text-sm sm:text-base"
                >
                  Create Room
                </Button>
                
                <div className="text-xs sm:text-sm text-gray-400 font-mono">
                  Create a new adventure and invite friends to join you.
                </div>
              </div>
            </Card>
            
            <Card 
              className="p-6 sm:p-8" 
              glowColor="purple"
              style={{ boxShadow: '0 0 8px rgba(167, 139, 250, 0.3)' }}
            >
              <h2 className="text-lg sm:text-xl font-mono font-bold text-purple-400 mb-3 sm:mb-4 flex items-center">
                <LogIn size={18} className="mr-2" />
                Join Existing Adventure
              </h2>
              
              <div className="space-y-4 sm:space-y-6">
                {!isAuthenticated && (
                  <Input
                    label="Choose a Username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    fullWidth
                    className="font-mono text-cyan-300 border-cyan-300/50 focus:border-cyan-300 placeholder-gray-500 text-sm sm:text-base"
                  />
                )}
                
                <Input
                  label="Room Code"
                  placeholder="Enter 4-digit room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  fullWidth
                  className="font-mono text-cyan-300 border-cyan-300/50 focus:border-cyan-300 placeholder-gray-500 text-sm sm:text-base"
                />
                
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={handleJoinRoom}
                  isLoading={isJoining}
                  disabled={(!isAuthenticated && !username.trim()) || !roomCode.trim()}
                  className="bg-purple-500 hover:bg-purple-400 text-white border-purple-400/50 hover:border-purple-400 hover:shadow-[0_0_5px_rgba(167,139,250,0.5)] transition-all font-mono py-2 sm:py-3 text-sm sm:text-base"
                >
                  Join Room
                </Button>
                
                <div className="text-xs sm:text-sm text-gray-400 font-mono">
                  Enter a room code to join an existing adventure.
                </div>
              </div>
            </Card>
          </div>
          
          <div className="mt-6 sm:mt-8 text-center text-gray-400 text-xs sm:text-sm font-mono">
            <p>
              OARigin is a gateway to the OAR ecosystem.
            </p>
            <p>
              Craft stories that may shape future adventures.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Home;