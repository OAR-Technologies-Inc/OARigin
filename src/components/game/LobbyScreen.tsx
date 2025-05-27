import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, UserPlus, Play, Users, Share2, Copy, Phone } from 'lucide-react';
import { useGameStore } from '../../store';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { GameGenre, GameMode } from '../../types';

const LobbyScreen: React.FC = () => {
  const navigate = useNavigate();
  const { currentRoom, players, isHost, startGame, setRoom } = useGameStore();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showShareSuccess, setShowShareSuccess] = useState(false);

  const handleGameModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!isHost || !currentRoom) return;
    const newGameMode = e.target.value as GameMode;
    setRoom({ ...currentRoom, gameMode: newGameMode });
  };

  const handleStartGame = () => {
    if (!isHost) return;
    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          startGame();
          navigate('/game');
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleShare = async () => {
    if (!currentRoom) return;

    const inviteText = `Join my OARigin adventure! Room code: ${currentRoom.code}\nhttps://oarigin.app/join/${currentRoom.code}`;

    // Check if the Contact Picker API is available
    if ('contacts' in navigator && 'ContactsManager' in window) {
      try {
        const contacts = await (navigator.contacts as any).select(
          ['tel', 'email'],
          { multiple: true }
        );

        if (contacts.length > 0) {
          // Use the SMS API if available
          if ('sms' in navigator) {
            const numbers = contacts
              .map((contact: any) => contact.tel)
              .flat()
              .join(',');
            window.location.href = `sms:${numbers}?body=${encodeURIComponent(inviteText)}`;
          } else {
            // Fallback to share API
            await navigator.share({
              title: 'Join OARigin Adventure',
              text: inviteText,
            });
          }
          return;
        }
      } catch (error) {
        console.log('Contact picker error:', error);
        // Fall through to clipboard copy
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(inviteText);
      setShowShareSuccess(true);
      setTimeout(() => setShowShareSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!currentRoom) {
    navigate('/');
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card className="p-6" glowColor="amber">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-mono font-bold text-amber-500 mb-1">
            Game Lobby
          </h1>
          <p className="text-gray-400">
            Waiting for players to join...
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Room info */}
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-lg font-mono font-semibold text-green-500 mb-2 flex items-center">
                <Users size={18} className="mr-2" /> Room Details
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Room Code:</span>
                  <span className="text-amber-500 font-mono font-bold">{currentRoom.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Genre:</span>
                  <span className="text-white">{currentRoom.genreTag}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Host:</span>
                  <span className="text-white">{players.find(p => p.id === currentRoom.hostId)?.username || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Players:</span>
                  <span className="text-white">{players.length}/4</span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-mono font-semibold text-green-500 mb-2 flex items-center">
                <UserPlus size={18} className="mr-2" /> Invite Players
              </h2>
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-400 mb-2">
                  Share this code with friends to join your game:
                </p>
                <div className="font-mono text-xl text-amber-500 font-bold text-center p-2 bg-gray-900 rounded border border-gray-700">
                  {currentRoom.code}
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  variant="primary"
                  fullWidth
                  icon={<Phone size={16} />}
                  onClick={handleShare}
                >
                  Invite Friends
                </Button>
                {showShareSuccess && (
                  <div className="text-center text-green-500 text-sm animate-fade-in">
                    Invite link copied to clipboard!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Players list */}
          <div>
            <h2 className="text-lg font-mono font-semibold text-green-500 mb-2 flex items-center">
              <Users size={18} className="mr-2" /> Players ({players.length}/4)
            </h2>
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              {players.map((player) => (
                <div 
                  key={player.id} 
                  className="flex items-center gap-3 p-2 rounded mb-2 bg-gray-900"
                >
                  <img 
                    src={player.avatar} 
                    alt={player.username} 
                    className="w-8 h-8 rounded-full border border-green-500/50" 
                  />
                  <span className="font-mono">
                    {player.username}
                    {player.id === currentRoom.hostId && (
                      <span className="text-amber-500 ml-2">(Host)</span>
                    )}
                  </span>
                </div>
              ))}

              {players.length < 4 && (
                <div className="text-gray-500 text-sm text-center p-2">
                  Waiting for more players...
                </div>
              )}
            </div>

            {isHost && (
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="font-mono text-sm font-semibold text-green-500 mb-2 flex items-center">
                    <Clock size={16} className="mr-2" /> Game Settings
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Game Genre:</span>
                      <select 
                        className="bg-gray-900 text-white border border-gray-700 rounded p-1 text-sm"
                        defaultValue={currentRoom.genreTag}
                      >
                        {Object.values(GameGenre).map((genre) => (
                          <option key={genre} value={genre}>{genre}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Game Mode:</span>
                      <select 
                        className="bg-gray-900 text-white border border-gray-700 rounded p-1 text-sm"
                        value={currentRoom.gameMode}
                        onChange={handleGameModeChange}
                      >
                        {Object.values(GameMode).map((mode) => (
                          <option key={mode} value={mode}>
                            {mode === GameMode.FREE_TEXT ? 'Free Text' : 'Multiple Choice'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <Button
                  variant="primary"
                  fullWidth
                  icon={<Play size={16} />}
                  onClick={handleStartGame}
                  disabled={countdown !== null}
                >
                  {countdown !== null 
                    ? `Starting in ${countdown}...` 
                    : 'Start Adventure'}
                </Button>
              </div>
            )}

            {!isHost && (
              <div className="text-center text-gray-400 font-mono mt-4">
                Waiting for host to start the game...
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LobbyScreen;