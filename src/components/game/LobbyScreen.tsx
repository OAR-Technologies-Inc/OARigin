import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Copy, Play, Users } from 'lucide-react';
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
    if (!currentRoom?.code) return;
    const inviteText = `Join my OARigin adventure! Room code: ${currentRoom.code}\nhttps://oarigin.app/join/${currentRoom.code}`;
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

  if (!Array.isArray(players) || players.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black">
        <Card className="p-6 max-w-md w-full border-2 border-green-500 bg-black">
          <p className="text-green-500 font-mono text-center animate-pulse">
            Connecting to Server...
          </p>
        </Card>
      </div>
    );
  }

  const hostPlayer = players.find(p => p.id === currentRoom.hostId);
  const roomCode = currentRoom.code || 'N/A';
  const genre = currentRoom.genreTag || 'Unknown';
  const hostName = hostPlayer?.username || 'Unknown';

  return (
    <div className="flex justify-center items-center min-h-screen bg-black">
      <Card className="p-6 max-w-md w-full border-2 border-green-500 bg-black relative">
        {/* CRT scanline effect */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,255,0,0.05)_1px,transparent_1px)] bg-[size:4px_4px] opacity-50"></div>

        {/* Room Status */}
        <div className="mb-6">
          <h1 className="text-green-500 font-mono text-2xl text-center mb-2">
            OARigin Terminal
          </h1>
          <div className="border border-green-500 p-2">
            <pre className="text-green-500 font-mono text-sm">
              +---------------- Room Status ----------------+
              | Code: {(roomCode).padEnd(32, ' ')} |
              | Genre: {(genre).padEnd(31, ' ')} |
              | Host: {(hostName).padEnd(32, ' ')} |
              | Players: {players.length}/4{''.padEnd(28, ' ')} |
              +--------------------------------------------+
            </pre>
          </div>
        </div>

        {/* Transmit Invite */}
        <div className="mb-6">
          <h2 className="text-green-500 font-mono text-lg mb-2 flex items-center">
            <Copy size={16} className="mr-2" /> Transmit Invite
          </h2>
          <div className="border border-amber-500 p-2 bg-gray-900 animate-pulse">
            <p className="text-amber-500 font-mono text-center">
              {roomCode}
            </p>
          </div>
          <Button
            variant="primary"
            fullWidth
            icon={<Copy size={16} />}
            onClick={handleShare}
            className="mt-2 bg-green-500 hover:bg-green-600 text-black font-mono"
            aria-label="Copy invite code"
          >
            [COPY]
          </Button>
          {showShareSuccess && (
            <p className="text-green-500 font-mono text-sm text-center mt-2">
              Code Copied!
            </p>
          )}
        </div>

        {/* Crew Manifest */}
        <div className="mb-6">
          <h2 className="text-green-500 font-mono text-lg mb-2 flex items-center">
            <Users size={16} className="mr-2" /> Crew Manifest
          </h2>
          <div className="border border-green-500 p-2">
            {players.map((player) => (
              <p
                key={player.id}
                className="text-green-500 font-mono text-sm"
              >
                > {player.username || 'Unknown'}
                {player.id === currentRoom.hostId && (
                  <span className="text-amber-500"> (Host)</span>
                )}
              </p>
            ))}
            {players.length < 4 && (
              <p className="text-green-500 font-mono text-sm text-center">
                Awaiting Crew...
              </p>
            )}
          </div>
        </div>

        {/* Host Controls */}
        {isHost ? (
          <div>
            <h2 className="text-green-500 font-mono text-lg mb-2 flex items-center">
              <Clock size={16} className="mr-2" /> Configure Mission
            </h2>
            <div className="border border-green-500 p-2 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-green-500 font-mono text-sm">> Genre:</span>
                <select
                  className="bg-black text-green-500 border border-green-500 font-mono text-sm p-1"
                  value={currentRoom.genreTag || GameGenre.HORROR}
                  onChange={(e) => {
                    if (!isHost || !currentRoom) return;
                    setRoom({ ...currentRoom, genreTag: e.target.value as GameGenre });
                  }}
                >
                  {Object.values(GameGenre).map((genre) => (
                    <option key={genre} value={genre} className="bg-black">
                      {genre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-green-500 font-mono text-sm">> Mode:</span>
                <select
                  className="bg-black text-green-500 border border-green-500 font-mono text-sm p-1"
                  value={currentRoom.gameMode || GameMode.FREE_TEXT}
                  onChange={handleGameModeChange}
                >
                  {Object.values(GameMode).map((mode) => (
                    <option key={mode} value={mode} className="bg-black">
                      {mode === GameMode.FREE_TEXT ? 'Free Text' : 'Multiple Choice'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              variant="primary"
              fullWidth
              icon={<Play size={16} />}
              onClick={handleStartGame}
              disabled={countdown !== null}
              className="bg-amber-500 hover:bg-amber-600 text-black font-mono"
              aria-label="Start game"
            >
              {countdown !== null ? `[LAUNCHING IN ${countdown}...]` : '[LAUNCH]'}
            </Button>
          </div>
        ) : (
          <p className="text-green-500 font-mono text-sm text-center">
            Awaiting Host Command...
          </p>
        )}
      </Card>
    </div>
  );
};

export default LobbyScreen;