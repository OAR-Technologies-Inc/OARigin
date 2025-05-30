import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, UserPlus, Play, Users } from 'lucide-react';
import { useGameStore } from '../../store';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { GameGenre } from '../../types';

const LobbyScreen: React.FC = () => {
  const navigate = useNavigate();
  const { currentRoom, players, isHost, startGame } = useGameStore();
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const handleStartGame = () => {
    if (!isHost) return;
    
    // Start a countdown
    setCountdown(5);
    
    // Countdown logic
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
              
              <Button
                variant="secondary"
                fullWidth
                onClick={() => navigator.clipboard.writeText(currentRoom.code)}
              >
                Copy Room Code
              </Button>
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