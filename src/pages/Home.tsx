import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogIn, UserCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useGameStore } from '../store';
import { GameGenre } from '../types';
import Logo from '../components/ui/Logo';
import { supabase } from '../lib/supabase';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentUser,
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
      await joinRoom(currentUser?.id || '', roomCode);
      navigate('/lobby');
    } catch (error) {
      console.error('Failed to join room:', error);
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
    } catch (error) {
      console.error('Matchmaking failed:', error);
      setJoiningMatchmaking(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const checkMatchStatus = async () => {
      const { currentUser, joinRoom } = useGameStore.getState();
      if (!currentUser) return;

      const { data: waitEntries } = await supabase
  .from('waiting_pool')
  .select('status')
  .eq('user_id', currentUser.id)
  .eq('status', 'matched')
  .limit(1);

if (!waitEntries || waitEntries.length === 0) return;


      const { data: session } = await supabase
        .from('sessions')
        .select('room_id')
        .eq('user_id', currentUser.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!session) return;

      clearInterval(interval);

      try {
        await joinRoom(currentUser.id, session.room_id);
        navigate('/lobby');
      } catch (err) {
        console.error('Failed to auto-join matched room:', err);
      }
    };

    const { currentUser } = useGameStore.getState();
    if (currentUser) {
      interval = setInterval(checkMatchStatus, 2000);
    }

    return () => clearInterval(interval);
  }, []);

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <Logo size="lg" />
            <h1 className="text-4xl font-bold font-mono text-green-500 mb-2">
              AI Storytelling Adventure
            </h1>
            <p className="text-xl text-gray-300">
              Embark on a cooperative text adventure with friends
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-8">
              <h2 className="text-xl font-mono font-bold text-green-500 mb-4 flex items-center">
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
                  <label className="block text-green-500 font-mono text-sm mb-1">
                    Select Genre
                  </label>
                  <select
                    className="bg-gray-800 border border-green-500 rounded-md px-4 py-2 w-full text-green-500"
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
                    className="rounded border-green-500 text-green-500 focus:ring-green-500"
                  />
                  <label htmlFor="isPublic" className="text-green-500 font-mono text-sm">
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
                  Join Matchmaking
                </Button>

                <div className="text-sm text-gray-400">
                  Create or join a public game to find teammates automatically.
                </div>
              </div>
            </Card>

            <Card className="p-8">
              <h2 className="text-xl font-mono font-bold text-green-500 mb-4 flex items-center">
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
                  onChange={(e) => setRoomCode(e.target.value)}
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

                <div className="text-sm text-gray-400">
                  Enter a room code to join an existing adventure.
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Home;
