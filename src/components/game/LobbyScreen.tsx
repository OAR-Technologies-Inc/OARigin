import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Copy, Play, Users } from 'lucide-react';
import { useGameStore } from '../../store';
import { supabase } from '../../lib/supabase';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { GameGenre, GameMode } from '../../types';
import { generateStoryBeginning } from '../../utils/mockAi';

const LobbyScreen: React.FC = () => {
  const navigate = useNavigate();
  const { currentRoom, players, isHost, startGame, setRoom, currentUser } = useGameStore();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showShareSuccess, setShowShareSuccess] = useState(false);
  const isMounted = useRef(true);

  // Debug data
  useEffect(() => {
    console.log('LobbyScreen Data:', { currentRoom, players, isHost });
  }, [currentRoom, players, isHost]);

  // Navigate when room status changes to in_progress
  useEffect(() => {
    if (currentRoom?.status === 'in_progress') {
      console.log('[NAVIGATION] Room status is in_progress, navigating to /game');
      navigate('/game');
    }
  }, [currentRoom?.status, navigate]);

  // Subscribe to room status and player updates
  useEffect(() => {
    const roomId = currentRoom?.id;
    if (!roomId) return;

    isMounted.current = true;

    const joinSession = async () => {
      if (!currentUser) {
        console.warn('[SESSION JOIN] No current user');
        return;
      }

      const { error } = await supabase
        .from('sessions')
        .upsert(
          [
            {
              user_id: currentUser.id,
              room_id: roomId,
              is_active: true,
            },
          ],
          { onConflict: 'user_id,room_id' }
        );

      if (error) {
        console.error('[SESSION JOIN ERROR]', error.message, error.details);
      } else {
        console.log('[SESSION JOINED]', { userId: currentUser.id, roomId });
      }
    };

    const fetchPlayers = async () => {
      if (!isMounted.current) return;
      console.log('[FETCH PLAYERS] Running fetch for room:', roomId);
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select(`
          user_id,
          profiles!inner(username, avatar_url)
        `)
        .eq('room_id', roomId)
        .eq('is_active', true);

      if (error) {
        console.error('[FETCH PLAYERS ERROR]', error.message, error.details);
        return;
      }

      const players = sessions?.map((s) => {
        const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
        return {
          id: s.user_id,
          username: profile?.username || 'Player',
          avatar:
            profile?.avatar_url ||
            `https://api.dicebear.com/7.x/pixel-art/svg?seed=${profile?.username || 'player'}`,
          oarWalletLinked: false,
          status: 'alive' as 'alive',
        };
      }) || [];

      if (isMounted.current) {
        useGameStore.getState().setPlayers(players);
      }
    };

    joinSession();
    fetchPlayers();

    const sessionChannel = supabase
      .channel(`lobby-room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if ('new' in payload && payload.new && 'room_id' in payload.new) {
            const sessionRoomId = (payload.new as { room_id: string }).room_id;
            if (sessionRoomId === roomId) {
              console.log('[REALTIME] sessions change received — refetching players');
              fetchPlayers();
            }
          }
        }
      )
      .subscribe((status, error) => {
        console.log('[SESSION SUBSCRIBE STATUS]', { status, error });
        if (error) console.error('[SESSION SUBSCRIBE ERROR]', error.message);
      });

    const roomChannel = supabase
      .channel(`room-status-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const raw = payload.new as Record<string, any>;
          const updatedRoom = {
            id: raw.id,
            code: raw.code,
            hostId: raw.hostId,
            status: raw.status,
            genreTag: raw.genreTag,
            gameMode: raw.gameMode as GameMode,
            currentNarrativeState: raw.currentNarrativeState,
            createdAt: raw.createdAt,
            isPublic: raw.isPublic,
          };
          console.log('[ROOM STATUS UPDATE]', updatedRoom);
          if (updatedRoom.status === 'in_progress') {
            console.log('[ROOM STATUS] Game started — updating store');
            useGameStore.getState().setRoom(updatedRoom);
          }
        }
      )
      .subscribe((status, error) => {
        console.log('[ROOM STATUS SUBSCRIBE]', { status, error });
        if (error) console.error('[ROOM STATUS SUBSCRIBE ERROR]', error.message);
      });

    return () => {
      isMounted.current = false;
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(roomChannel);
    };
  }, [currentRoom?.id]);

  const handleGameModeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!isHost || !currentRoom) return;
    const newGameMode = e.target.value as GameMode;
    const { error } = await supabase
      .from('rooms')
      .update({
        game_mode: newGameMode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentRoom.id);

    if (error) {
      console.error('[GAME MODE UPDATE ERROR]', error.message, error.details);
    } else {
      setRoom({ ...currentRoom, gameMode: newGameMode });
    }
  };

  const handleGenreChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!isHost || !currentRoom) return;
    const newGenre = e.target.value as GameGenre;
    const { error } = await supabase
      .from('rooms')
      .update({
        genre_tag: newGenre,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentRoom.id);

    if (error) {
      console.error('[GENRE UPDATE ERROR]', error.message, error.details);
    } else {
      setRoom({ ...currentRoom, genreTag: newGenre });
    }
  };

  const handleStartGame = async () => {
    if (!isHost || !currentRoom || !currentUser) return;
    setCountdown(5);
    const interval = setInterval(async () => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          startGame();

          // Initialize game_state
          const initializeGameState = async () => {
            try {
              const { data: existingState, error: checkError } = await supabase
                .from('game_state')
                .select('id')
                .eq('room_id', currentRoom.id)
                .limit(1);

              if (checkError) {
                console.error('[CHECK GAME STATE ERROR]', checkError.message, checkError.details);
                return;
              }

              if (existingState?.length > 0) {
                console.log('[GAME STATE EXISTS]', { roomId: currentRoom.id });
                return;
              }

              let initialStory: string;
              try {
                initialStory = await generateStoryBeginning(
                  currentRoom.genreTag || 'adventure',
                  players,
                  currentRoom
                );
              } catch (err) {
                console.error('[GENERATE STORY BEGINNING ERROR]', err);
                initialStory = 'The adventure begins in a mysterious realm...';
              }

              console.log('[GENERATE STORY BEGINNING]', initialStory);

              const { data, error } = await supabase
                .from('game_state')
                .insert({
                  room_id: currentRoom.id,
                  current_narrative: initialStory,
                  story_log: JSON.stringify([{ type: 'intro', text: initialStory }]),
                  current_turn: 0,
                  current_player_id: currentUser.id,
                  dead_players: [],
                })
                .select()
                .single();

              if (error) {
                console.error('[GAME STATE INSERT ERROR]', error.message, error.details);
              } else {
                console.log('[GAME STATE INITIALIZED]', { roomId: currentRoom.id, data });
              }
            } catch (error) {
              console.error('[STORY GENERATION ERROR]', error);
            }
          };

          initializeGameState();
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

  const roomCode = currentRoom.code || 'N/A';
  const genre = currentRoom.genreTag || GameGenre.HORROR;
  const hostPlayer = players.find((p) => p.id === currentRoom.hostId);
  const hostName = hostPlayer?.username || 'Unknown';
  const playerCount = players.length;

  return (
    <div className="flex justify-center items-center min-h-screen bg-black">
      <Card className="p-6 max-w-md w-full border-2 border-green-500 bg-black relative">
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,255,0,0.05)_1px,transparent_1px)] bg-[size:4px_4px] opacity-50"></div>

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

        <div className="mb-6">
          <h2 className="text-green-500 font-mono text-lg mb-2 flex items-center">
            <Copy size={16} className="mr-2" /> Transmit Invite
          </h2>
          <div className="border border-amber-500 p-2 bg-gray-900 animate-pulse">
            <p className="text-amber-500 font-mono text-center">{roomCode}</p>
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

        <div className="mb-6">
          <h2 className="text-green-500 font-mono text-lg mb-2 flex items-center">
            <Users size={16} className="mr-2" /> Crew Manifest
          </h2>
          <div className="border border-green-500 p-2">
            {players.map((player) => (
              <p key={player.id} className="text-green-500 font-mono text-sm">
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

        <div>
          <h2 className="text-green-500 font-mono text-lg mb-2 flex items-center">
            <Clock size={16} className="mr-2" /> Configure Mission
          </h2>
          {isHost ? (
            <>
              <div className="border border-green-500 p-2 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-green-500 font-mono text-sm">{'>'} Genre:</span>
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
                  <span className="text-green-500 font-mono text-sm">{'>'} Mode:</span>
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
