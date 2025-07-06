import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Copy, Play, Users } from 'lucide-react';
import { useGameStore } from '../../store';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { GameGenre, GameMode } from '../../types';
import { supabase } from '../../lib/supabase';

const LobbyScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentRoom,
    players,
    isHost,
    startGame,
    setRoom,
    currentUser,
  } = useGameStore();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showShareSuccess, setShowShareSuccess] = useState(false);


  useEffect(() => {
    if (!currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    if (!currentRoom) {
      navigate('/');
    }
  }, [currentRoom, navigate]);

  const handleGameModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!isHost || !currentRoom) return;
    const newGameMode = e.target.value as GameMode;
    setRoom({ ...currentRoom, gameMode: newGameMode });
  };

  const handleGenreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!isHost || !currentRoom) return;
    const newGenre = e.target.value as GameGenre;
    setRoom({ ...currentRoom, genreTag: newGenre });
  };

  const handleStartGame = () => {
    if (!isHost || !currentRoom) return;
    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          supabase
            .from('rooms')
            .update({ status: 'in_progress' })
            .eq('id', currentRoom.id);
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

  useEffect(() => {
    const roomId = currentRoom?.id;
    if (!roomId) return;

    const fetchPlayers = async () => {
      const { data: sessions } = await supabase
        .from('sessions')
        .select(`user_id, profiles!inner(username, avatar_url)`)
        .eq('room_id', roomId)
        .eq('is_active', true);

      const playerList = sessions?.map((s) => ({
        id: s.user_id,
        username: s.profiles?.username || 'Player',
        avatar:
          s.profiles?.avatar_url ||
          `https://api.dicebear.com/7.x/pixel-art/svg?seed=${s.profiles?.username || 'player'}`,
        oarWalletLinked: false,
        status: 'alive',
      })) || [];
      useGameStore.getState().setPlayers(playerList);
    };

    fetchPlayers();

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions', filter: `room_id=eq.${roomId}` },
        fetchPlayers
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          if (payload.new.status === 'in_progress') {
            navigate('/game');
          }
        }
      );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRoom?.id, navigate]);


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

  // Prepare room data with safe access
  const roomCode = currentRoom.code || 'N/A';
  const genre = currentRoom.genreTag || GameGenre.HORROR;
  const hostPlayer = players.find(p => p.id === currentRoom.hostId);
  const hostName = hostPlayer?.username || 'Unknown';
  const playerCount = players.length;

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
              | Code: {roomCode.padEnd(32, ' ')} |
              | Genre: {genre.padEnd(31, ' ')} |
              | Host: {hostName.padEnd(32, ' ')} |
              | Players: {playerCount}/4{''.padEnd(28, ' ')} |
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
                &gt; {player.username || 'Unknown'}
                {player.id === currentRoom.hostId && (
                  <span className="text-amber-500"> (Host)</span>
                )}
              </p>
            ))}
            {playerCount < 4 && (
              <p className="text-green-500 font-mono text-sm text-center">
                Awaiting Crew...
              </p>
            )}
          </div>
        </div>

        {/* Host Controls */}
        <div>
          <h2 className="text-green-500 font-mono text-lg mb-2 flex items-center">
            <Clock size={16} className="mr-2" /> Configure Mission
          </h2>
          {isHost ? (
            <>
              <div className="border border-green-500 p-2 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-green-500 font-mono text-sm">&gt; Genre:</span>
                  <select
                    className="bg-black text-green-500 border border-green-500 font-mono text-sm p-1"
                    value={currentRoom.genreTag || GameGenre.HORROR}
                    onChange={handleGenreChange}
                  >
                    {Object.values(GameGenre).map((genre) => (
                      <option key={genre} value={genre} className="bg-black">
                        {genre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-500 font-mono text-sm">&gt; Mode:</span>
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
            </>
          ) : (
            <p className="text-green-500 font-mono text-sm text-center">
              Awaiting Host Command...
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default LobbyScreen;