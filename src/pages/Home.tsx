import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogIn } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useGameStore } from '../store';
import { GameGenre } from '../types';
import { supabase } from '../lib/supabase';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    generateTempUser,
    createRoom,
    joinRoom,
    joinMatchmaking,
  } = useGameStore();

  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<GameGenre>(GameGenre.FANTASY);
  const [isPublic, setIsPublic] = useState(false);
  const [joiningMatchmaking, setJoiningMatchmaking] = useState(false);

  const handleCreateRoom = async () => {
    if (!isAuthenticated) {
      if (!username.trim()) return;
      generateTempUser(username);
    }

    try {
      setIsCreating(true);
      await createRoom(selectedGenre, isPublic);
      navigate('/lobby');
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) return;

    if (!isAuthenticated) {
      if (!username.trim()) return;
      generateTempUser(username);
    }

    try {
      setIsJoining(true);
      const { currentUser } = useGameStore.getState();
      if (!currentUser) throw new Error('No user available');

      const normalizedCode = roomCode.trim().toUpperCase();
      await joinRoom(currentUser.id, normalizedCode);
      navigate('/lobby');
    } catch (error) {
      console.error('Failed to join room:', error);
      alert('Failed to join room. Please check the room code and try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoinMatchmaking = async () => {
    if (!isAuthenticated) {
      if (!username.trim()) return;
      generateTempUser(username);
    }

    try {
      setJoiningMatchmaking(true);
      await joinMatchmaking(selectedGenre);
      
      // Start polling for match
      const pollInterval = setInterval(async () => {
        const { currentUser } = useGameStore.getState();
        if (!currentUser) {
          clearInterval(pollInterval);
          setJoiningMatchmaking(false);
          return;
        }

        try {
          // Check if user has been matched
          const { data: waitEntry } = await supabase
            .from('waiting_pool')
            .select('status')
            .eq('user_id', currentUser.id)
            .single();

          if (waitEntry?.status === 'matched') {
            // Get the session/room info
            const { data: session } = await supabase
              .from('sessions')
              .select('room_id')
              .eq('user_id', currentUser.id)
              .eq('is_active', true)
              .single();

            if (session?.room_id) {
              clearInterval(pollInterval);
              
              // Get room details
              const { data: room } = await supabase
                .from('rooms')
                .select('code')
                .eq('id', session.room_id)
                .single();

              if (room?.code) {
                await joinRoom(currentUser.id, room.code);
                navigate('/lobby');
              }
            }
          }
        } catch (error) {
          console.error('Matchmaking poll error:', error);
        }
      }, 2000);

      // Clean up after 30 seconds
      setTimeout(() => {
        clearInterval(pollInterval);
        setJoiningMatchmaking(false);
      }, 30000);

    } catch (error) {
      console.error('Matchmaking failed:', error);
      alert('Failed to join matchmaking. Please try again.');
      setJoiningMatchmaking(false);
    }
  };

  return (
    <Layout>
      <div
        className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center p-4"
        style={{ backgroundImage: 'url("/oarigin-bg.jpg")' }}
      >
        <div className="w-full max-w-5xl">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-bold text-purple-300 tracking-widest">OARigin</h1>
            <p className="text-md mt-4 text-purple-500">
              Step into a mythic terminal where your decisions shape reality. Enter as yourself. Leave as legend.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8 bg-gray-900/70 border border-purple-800">
              <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center">
                <Plus size={18} className="mr-2" />
                Create New Adventure
              </h2>

              <div className="space-y-6">
                {!isAuthenticated && (
                  <Input
                    label="Choose a Username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    fullWidth
                  />
                )}

                <div>
                  <label className="block text-purple-300 text-sm mb-1">
                    Select Genre
                  </label>
                  <select
                    className="bg-black border border-purple-600 rounded-md px-4 py-2 w-full text-purple-300"
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value as GameGenre)}
                  >
                    {Object.values(GameGenre).map((genre) => (
                      <option key={genre} value={genre}>{genre}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="rounded border-purple-600 text-purple-600 focus:ring-purple-600"
                  />
                  <label htmlFor="isPublic" className="text-purple-300 text-sm">
                    Public Room (Allow Matchmaking)
                  </label>
                </div>

                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleCreateRoom}
                  isLoading={isCreating}
                  disabled={!isAuthenticated && !username.trim()}
                >
                  Create Room
                </Button>

                <Button
                  variant="secondary"
                  fullWidth
                  onClick={handleJoinMatchmaking}
                  isLoading={joiningMatchmaking}
                  disabled={!isAuthenticated && !username.trim()}
                >
                  {joiningMatchmaking ? 'Finding Match...' : 'Join Matchmaking'}
                </Button>
              </div>
            </Card>

            <Card className="p-8 bg-gray-900/70 border border-purple-800">
              <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center">
                <LogIn size={18} className="mr-2" />
                Join Existing Adventure
              </h2>

              <div className="space-y-6">
                {!isAuthenticated && (
                  <Input
                    label="Choose a Username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    fullWidth
                  />
                )}

                <Input
                  label="Room Code"
                  placeholder="Enter room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.trim().toUpperCase())}
                  fullWidth
                />

                <Button
                  variant="secondary"
                  fullWidth
                  onClick={handleJoinRoom}
                  isLoading={isJoining}
                  disabled={(!isAuthenticated && !username.trim()) || !roomCode.trim()}
                >
                  Join Room
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Home;