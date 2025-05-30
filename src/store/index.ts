import { create } from 'zustand';
import { GameGenre, Room, User, StorySegment, Vote, RoomStatus, GameMode, GameState, GameProgress } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';

interface GameStoreState {
  // User state
  currentUser: User | null;
  isAuthenticated: boolean;

  // Room state
  currentRoom: Room | null;
  players: User[];
  previousPlayers: User[];
  newPlayers: User[];
  isHost: boolean;

  // Game state
  storySegments: StorySegment[];
  currentVotes: Vote[];
  gameState: GameState;
  loadingStory: boolean;
  currentPlayerIndex: number;
  deadPlayers: string[];
  progress: GameProgress;

  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setRoom: (room: Room | null) => void;
  setPlayers: (players: User[]) => void;
  setPlayerStatus: (userId: string, status: 'alive' | 'dead') => void;
  clearNewPlayers: () => void;
  addStorySegment: (segment: StorySegment) => void;
  addVote: (vote: Vote) => void;
  startGame: () => void;
  endGame: () => void;
  setLoadingStory: (loading: boolean) => void;
  setCurrentPlayerIndex: (index: number) => void;
  nextPlayerTurn: () => void;
  generateTempUser: (username: string) => void;
  createRoom: (genre: GameGenre, isPublic: boolean) => Promise<string>;
  joinRoom: (userId: string, roomCode: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  setPlayerDeath: (playerName: string) => void;
  checkGameEnd: () => void;
  updateProgress: (updates: Partial<GameProgress>) => void;
  subscribeToRoom: (roomId: string) => () => void;
  joinMatchmaking: (genre: GameGenre) => Promise<void>;
  leaveMatchmaking: () => Promise<void>;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  // Initial state
  currentUser: null,
  isAuthenticated: false,
  currentRoom: null,
  players: [],
  previousPlayers: [],
  newPlayers: [],
  isHost: false,
  storySegments: [],
  currentVotes: [],
  gameState: GameState.PLAYING,
  loadingStory: false,
  currentPlayerIndex: 0,
  deadPlayers: [],
  progress: {},

  // Actions
  setUser: (user) => set({ currentUser: user }),

  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),

  setRoom: (room) =>
    set((state) => ({
      currentRoom: room,
      isHost: room ? state.currentUser?.id === room.hostId : false
    })),

  setPlayers: (players) => set((state) => {
    const newPlayers = players.filter(
      (player) => !state.previousPlayers.some((prev) => prev.id === player.id)
    );
    return {
      players: players.map(newPlayer => ({
        ...newPlayer,
        status: state.players.find(p => p.id === newPlayer.id)?.status || 'alive'
      })),
      previousPlayers: players,
      newPlayers: [...state.newPlayers, ...newPlayers]
    };
  }),

  setPlayerStatus: (userId, status) =>
    set((state) => ({
      players: state.players.map(player =>
        player.id === userId ? { ...player, status } : player
      )
    })),

  clearNewPlayers: () => set({ newPlayers: [] }),

  addStorySegment: (segment) =>
    set((state) => ({
      storySegments: [...state.storySegments, segment],
      currentVotes: []
    })),

  addVote: (vote) =>
    set((state) => ({
      currentVotes: [...state.currentVotes, vote]
    })),

  startGame: () =>
    set((state) => ({
      gameState: GameState.PLAYING,
      currentRoom: state.currentRoom
        ? { ...state.currentRoom, status: RoomStatus.IN_PROGRESS }
        : null,
      currentPlayerIndex: 0,
      deadPlayers: [],
      progress: {}
    })),

  endGame: () =>
    set((state) => ({
      gameState: GameState.ENDED,
      currentRoom: state.currentRoom
        ? { ...state.currentRoom, status: RoomStatus.CLOSED }
        : null
    })),

  setLoadingStory: (loading) => set({ loadingStory: loading }),

  setCurrentPlayerIndex: (index) => set({ currentPlayerIndex: index }),

  nextPlayerTurn: () =>
    set((state) => {
      const alivePlayers = state.players.filter(p => p.status === 'alive');
      if (alivePlayers.length === 0) {
        return { currentPlayerIndex: 0, gameState: GameState.ENDED };
      }
      
      let nextIndex = state.currentPlayerIndex;
      do {
        nextIndex = (nextIndex + 1) % state.players.length;
      } while (state.players[nextIndex].status === 'dead' && nextIndex !== state.currentPlayerIndex);
      
      return { currentPlayerIndex: nextIndex };
    }),

  generateTempUser: (username) =>
    set((state) => {
      if (!state.currentUser && state.gameState !== GameState.PLAYING) {
        return {
          currentUser: {
            id: uuidv4(),
            username,
            avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`,
            oarWalletLinked: false,
            status: 'alive'
          },
          isAuthenticated: true
        };
      }
      return state;
    }),

    createRoom: async (genre: GameGenre, isPublic: boolean) => {
    const { currentUser } = get();
    if (!currentUser) throw new Error('No user logged in');

    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data: room, error } = await supabase
      .from('rooms')
      .insert({
        code: roomCode,
        genre_tag: genre,
        host_id: currentUser.id,
        is_public: isPublic,
        status: RoomStatus.OPEN
      })
      .select()
      .single();

    if (error) throw error;

    const { error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: currentUser.id,
        room_id: room.id
      });

    if (sessionError) throw sessionError;

    set({
      currentRoom: {
        ...room,
        genreTag: room.genre_tag
      },
      isHost: true,
      players: [{ ...currentUser, status: 'alive' }],
      previousPlayers: [{ ...currentUser, status: 'alive' }],
      newPlayers: [],
      currentPlayerIndex: 0,
      gameState: GameState.PLAYING,
      deadPlayers: [],
      progress: {}
    });

    return roomCode;
  },

  joinRoom: async (userId: string, roomCode: string) => {
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select()
      .eq('code', roomCode)
      .single();

    if (roomError) throw roomError;

    const { data: existingSession } = await supabase
      .from('sessions')
      .select()
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (existingSession) {
      throw new Error('Already in an active session');
    }

    const { error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: userId,
        room_id: room.id
      });

    if (sessionError) throw sessionError;

    const { currentUser } = get();
    if (currentUser) {
      set({
        currentRoom: {
          ...room,
          genreTag: room.genre_tag
        },
        isHost: room.host_id === userId,
        players: [{ ...currentUser, status: 'alive' }],
        previousPlayers: [{ ...currentUser, status: 'alive' }],
        newPlayers: [],
        currentPlayerIndex: 0
      });
    }
  },

  leaveRoom: async () => {
    const { currentRoom, currentUser } = get();
    if (!currentRoom || !currentUser) return;

    await supabase
      .from('sessions')
      .update({ is_active: false })
      .eq('user_id', currentUser.id)
      .eq('room_id', currentRoom.id);

    set({
      currentRoom: null,
      isHost: false,
      players: [],
      previousPlayers: [],
      newPlayers: [],
      storySegments: [],
      currentVotes: [],
      gameState: GameState.PLAYING,
      currentPlayerIndex: 0,
      deadPlayers: [],
      progress: {}
    });
  },

  setPlayerDeath: (playerName) =>
    set((state) => {
      const player = state.players.find(p => p.username === playerName);
      if (!player) return state;

      const updatedPlayers = state.players.map(p =>
        p.username === playerName ? { ...p, status: 'dead' as const } : p
      );

      const updatedDeadPlayers = [...state.deadPlayers, playerName];
      const alivePlayers = updatedPlayers.filter(p => p.status === 'alive');

      const newGameState = alivePlayers.length === 0 ? GameState.ENDED : state.gameState;

      return {
        players: updatedPlayers,
        deadPlayers: updatedDeadPlayers,
        gameState: newGameState,
        currentPlayerIndex: newGameState === GameState.ENDED ? 0 : state.currentPlayerIndex
      };
    }),

  checkGameEnd: () =>
    set((state) => {
      const alivePlayers = state.players.filter(p => p.status === 'alive');
      if (alivePlayers.length === 0) {
        return { gameState: GameState.ENDED, currentPlayerIndex: 0 };
      }

      const { currentRoom, progress } = state;
      if (!currentRoom) return state;

      let shouldEnd = false;
      switch (currentRoom.genreTag.toLowerCase()) {
        case 'survival':
          shouldEnd = (progress.daysSurvived ?? 0) >= 7 || (progress.milesTraveled ?? 0) >= 10;
          break;
        case 'fantasy':
          shouldEnd = (progress.artifactsFound ?? 0) >= 3;
          break;
        case 'horror':
          shouldEnd = (progress.cluesFound ?? 0) >= 5;
          break;
        case 'sci-fi':
          shouldEnd = (progress.nodesDisabled ?? 0) >= 5;
          break;
        case 'mystery':
          shouldEnd = (progress.cluesFound ?? 0) >= 8;
          break;
        case 'adventure':
          shouldEnd = (progress.distanceCovered ?? 0) >= 100;
          break;
      }

      return shouldEnd ? { gameState: GameState.ENDED, currentPlayerIndex: 0 } : state;
    }),

  updateProgress: (updates) =>
    set((state) => ({
      progress: { ...state.progress, ...updates }
    })),

  subscribeToRoom: (roomId: string) => {
    const subscription = supabase
      .channel(`room:${roomId}`)
      .on('presence', { event: 'sync' }, () => {})
      .on('presence', { event: 'join' }, () => {})
      .on('presence', { event: 'leave' }, () => {})
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },

  joinMatchmaking: async (genre: GameGenre) => {
  const { currentUser } = get();
  if (!currentUser) throw new Error('No user logged in');

  const { data: existing } = await supabase
    .from('waiting_pool')
    .select()
    .eq('user_id', currentUser.id)
    .in('status', ['waiting', 'matched'])
    .limit(1);

  if (existing && existing.length > 0) {
    console.warn('User already in matchmaking queue');
    return; // silently return instead of throwing
  }

  const { error } = await supabase
    .from('waiting_pool')
    .insert({
      user_id: currentUser.id,
      genre,
      status: 'waiting'
    });

  if (error) throw error;
}

  leaveMatchmaking: async () => {
    const { currentUser } = get();
    if (!currentUser) return;

    await supabase
      .from('waiting_pool')
      .update({ status: 'left' })
      .eq('user_id', currentUser.id)
      .eq('status', 'waiting');
  }
}));
