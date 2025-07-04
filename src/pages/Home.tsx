import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogIn } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import AuthModal from '../components/auth/AuthModal';
import { useGameStore } from '../store';
import { GameGenre } from '../types';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    createRoom,
    joinRoom,
  } = useGameStore();

  const [authAction, setAuthAction] = useState<(() => Promise<void>) | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<GameGenre>(GameGenre.FANTASY);
  const [isPublic, setIsPublic] = useState(false);
  const [joiningMatchmaking, setJoiningMatchmaking] = useState(false);

  const handleCreateRoom = async () => {
    const action = async () => {
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

    if (!isAuthenticated) {
      setAuthAction(() => action);
      setIsAuthModalOpen(true);
      return;
    }

    await action();
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) return;

    const action = async () => {
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

    if (!isAuthenticated) {
      setAuthAction(() => action);
      setIsAuthModalOpen(true);
      return;
    }

    await action();
  };

  const handleJoinMatchmaking = async () => {
    const action = async () => {
      try {
        setJoiningMatchmaking(true);
        await createRoom(selectedGenre, true);
        navigate('/lobby');
      } catch (error) {
        console.error('Matchmaking failed:', error);
        alert('Failed to join matchmaking. Please try again.');
      } finally {
        setJoiningMatchmaking(false);
      }
    };

    if (!isAuthenticated) {
      setAuthAction(() => action);
      setIsAuthModalOpen(true);
      return;
    }

    await action();
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
                >
                  Create Room
                </Button>

                <Button
                  variant="secondary"
                  fullWidth
                  onClick={handleJoinMatchmaking}
                  isLoading={joiningMatchmaking}
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
                  disabled={!roomCode.trim()}
                >
                  Join Room
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthAction(null);
        }}
        onSuccess={async () => {
          setIsAuthModalOpen(false);
          const action = authAction;
          setAuthAction(null);
          if (action) await action();
        }}
      />
    </Layout>
  );
};

export default Home;