import { create } from 'zustand';
import { GameGenre, Room, User, StorySegment, Vote, RoomStatus, GameMode, GameState, GameProgress } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface GameStore {
  currentUser: User | null;
  isAuthenticated: boolean;
  currentRoom: Room | null;
  players: User[];
  storySegments: StorySegment[];
  currentVotes: Vote[];
  gameState: GameState;
  loadingStory: boolean;
  currentPlayerIndex: number;
  presenceChannel: RealtimeChannel | null;
  deadPlayers: string[];
  progress: GameProgress;
  isHost: boolean;
  newPlayers: User[];
  setUser: (user: User | null) => void;
  setAuthenticated: (isAuth: boolean) => void;
  setRoom: (room: Room | null) => void;
  setPlayers: (players: User[]) => void;
  addStorySegment: (segment: StorySegment) => void;
  addVote: (vote: Vote) => void;
  clearVotes: () => void;
  setGameState: (state: GameState) => void;
  setLoadingStory: (loading: boolean) => void;
  setPresenceChannel: (channel: RealtimeChannel) => void;
  startGame: () => void;
  markPlayerDead: (userId: string) => void;
  setProgress: (progress: GameProgress) => void;
  updateProgress: (progress: Partial<GameProgress>) => void;
  nextPlayerTurn: () => void;
  checkGameEnd: () => void;
  clearNewPlayers: () => void;
  generateTempUser: (username: string) => void;
  joinMatchmaking: (genre: GameGenre) => Promise<void>;
  leaveMatchmaking: () => Promise<void>;
  createRoom: (genre: GameGenre, isPublic: boolean) => Promise<void>;
  joinRoom: (userId: string, roomCode: string) => Promise<void>;
  unsubscribeSessionListener: () => void;
}

// Flag to prevent multiple session listener subscriptions
let sessionSyncStarted = false;

export const useGameStore = create<GameStore>((set, get) => {
  // Initialize the session listener
  const startSessionListener = () => {
    if (sessionSyncStarted) return;
    sessionSyncStarted = true;

    supabase
      .channel('session-room-sync')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sessions',
        },
        async (payload) => {
          const roomId = payload.new.room_id;
          const { currentRoom } = get();

          if (currentRoom && currentRoom.id === roomId) {
            const { data: sessions } = await supabase
              .from('sessions')
              .select(`
                user_id,
                profiles!inner(username, avatar_url)
              `)
              .eq('room_id', roomId)
              .eq('is_active', true);

            const players: User[] = sessions?.map((session) => ({
              id: session.user_id,
              username: session.profiles?.username || 'Player',
              avatar:
                session.profiles?.avatar_url ||
                `https://api.dicebear.com/7.x/pixel-art/svg?seed=${session.profiles?.username || 'player'}`,
              oarWalletLinked: false,
              status: 'alive',
            })) || [];

            // Defer state update to avoid render-phase conflicts
            setTimeout(() => {
              set({ players });
            }, 0);
          }
        }
      )
      .subscribe();
  };

  // Start the listener when the store is created
  startSessionListener();

  return {
    currentUser: null,
    isAuthenticated: false,
    currentRoom: null,
    players: [],
    storySegments: [],
    currentVotes: [],
    gameState: GameState.LOBBY,
    loadingStory: false,
    currentPlayerIndex: 0,
    presenceChannel: null,
    deadPlayers: [],
    progress: {},
    isHost: false,
    newPlayers: [],

    setUser: (user) => set({ currentUser: user }),
    setAuthenticated: (isAuth) => set({ isAuthenticated: isAuth }),
    setRoom: (room) => set({ currentRoom: room }),
    setPlayers: (players) => set({ players }),
    addStorySegment: (segment) => set((state) => ({ storySegments: [...state.storySegments, segment] })),
    addVote: (vote) => set((state) => ({ currentVotes: [...state.currentVotes, vote] })),
    clearVotes: () => set({ currentVotes: [] }),
    setGameState: (state) => set({ gameState: state }),
    setLoadingStory: (loading) => set({ loadingStory: loading }),
    setPresenceChannel: (channel) => set({ presenceChannel: channel }),
    clearNewPlayers: () => set({ newPlayers: [] }),

    generateTempUser: (username) => {
      const tempUser: User = {
        id: uuidv4(),
        username,
        avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`,
        oarWalletLinked: false,
        status: 'alive',
      };
      set({ currentUser: tempUser, isAuthenticated: true });
    },

    startGame: () => set((state) => ({
      gameState: GameState.PLAYING,
      currentRoom: state.currentRoom
        ? { ...state.currentRoom, status: RoomStatus.IN_PROGRESS }
        : null,
      currentPlayerIndex: 0,
      deadPlayers: [],
      progress: {},
    })),

    markPlayerDead: (userId) => set((state) => ({
      deadPlayers: [...state.deadPlayers, userId],
      players: state.players.map((p) =>
        p.id === userId ? { ...p, status: 'dead' } : p
      ),
    })),

    setProgress: (progress) => set({ progress }),

    updateProgress: (progress) => set((state) => ({
      progress: { ...state.progress, ...progress },
    })),

    nextPlayerTurn: () => set((state) => {
      const alivePlayers = state.players.filter((p) => p.status === 'alive');
      if (alivePlayers.length === 0) return state;

      let nextIndex = (state.currentPlayerIndex + 1) % state.players.length;

      // Skip dead players
      while (state.players[nextIndex]?.status === 'dead' && alivePlayers.length > 0) {
        nextIndex = (nextIndex + 1) % state.players.length;
      }

      return { currentPlayerIndex: nextIndex };
    }),

    checkGameEnd: () => set((state) => {
      const allDead = state.players.every((p) => state.deadPlayers.includes(p.id));
      if (allDead) {
        return { gameState: GameState.ENDED };
      }
      return state;
    }),

    joinMatchmaking: async (genre: GameGenre) => {
      const { currentUser } = get();
      if (!currentUser) throw new Error('No user logged in');

      // Check if user is already in matchmaking
      const { data: existing } = await supabase
        .from('waiting_pool')
        .select()
        .eq('user_id', currentUser.id)
        .in('status', ['waiting', 'matched'])
        .limit(1);

      if (existing && existing.length > 0) {
        console.warn('User already in matchmaking queue');
        return;
      }

      const { error } = await supabase
        .from('waiting_pool')
        .insert({
          user_id: currentUser.id,
          genre,
          status: 'waiting',
        });

      if (error) throw error;
    },

    leaveMatchmaking: async () => {
      const { currentUser } = get();
      if (!currentUser) return;

      await supabase
        .from('waiting_pool')
        .update({ status: 'left' })
        .eq('user_id', currentUser.id)
        .eq('status', 'waiting');
    },

    createRoom: async (genre: GameGenre, isPublic: boolean) => {
      const { currentUser } = get();
      if (!currentUser) throw new Error('No user logged in');

      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data: room, error } = await supabase
        .from('rooms')
        .insert({
          code: roomCode,
          genre_tag: genre,
          status: 'open',
          host_id: currentUser.id,
          is_public: isPublic,
          game_mode: GameMode.FREE_TEXT,
        })
        .select()
        .single();

      if (error) throw error;

      // Create session for the host
      const { error: sessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: currentUser.id,
          room_id: room.id,
          is_active: true,
        });

      if (sessionError) throw sessionError;

      set({
        currentRoom: {
          id: room.id,
          code: room.code,
          status: room.status as RoomStatus,
          currentNarrativeState: room.current_narrative_state || '',
          genreTag: room.genre_tag as GameGenre,
          createdAt: room.created_at,
          hostId: room.host_id,
          gameMode: (room.game_mode as GameMode) || GameMode.FREE_TEXT,
        },
        players: [currentUser],
        isHost: true,
        gameState: GameState.LOBBY,
      });
    },

    joinRoom: async (userId: string, roomCode: string) => {
      // Find room by code
      const { data: room, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', roomCode.toUpperCase())
        .eq('status', 'open')
        .single();

      if (error || !room) throw new Error('Room not found or no longer available');

      // Create session for the user
      const { error: sessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: userId,
          room_id: room.id,
          is_active: true,
        });

      if (sessionError) throw sessionError;

      // Manually fetch all players right after joining
      const { data: updatedSessions } = await supabase
        .from('sessions')
        .select(`
          user_id,
          profiles!inner(username, avatar_url)
        `)
        .eq('room_id', room.id)
        .eq('is_active', true);

      const updatedPlayers: User[] = updatedSessions?.map((session) => ({
        id: session.user_id,
        username: session.profiles?.username || 'Player',
        avatar: session.profiles?.avatar_url || '',
        oarWalletLinked: false,
        status: 'alive',
      })) || [];

      const isHost = room.host_id === userId;

      set({
        currentRoom: {
          id: room.id,
          code: room.code,
          status: room.status as RoomStatus,
          currentNarrativeState: room.current_narrative_state || '',
          genreTag: room.genre_tag as GameGenre,
          createdAt: room.created_at,
          hostId: room.host_id,
          gameMode: (room.game_mode as GameMode) || GameMode.FREE_TEXT,
        },
        players: updatedPlayers,
        isHost,
        gameState: GameState.LOBBY,
      });
    },

    unsubscribeSessionListener: () => {
      if (sessionSyncStarted) {
        supabase.channel('session-room-sync').unsubscribe();
        sessionSyncStarted = false;
      }
    },
  };
});