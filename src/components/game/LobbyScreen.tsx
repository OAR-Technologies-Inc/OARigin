import { create } from 'zustand';
import { GameGenre, Room, User, StorySegment, Vote, RoomStatus, GameMode, GameState, GameProgress } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface GameStoreState {
  currentUser: User | null;
  isAuthenticated: boolean;

  currentRoom: Room | null;
  players: User[];
  previousPlayers: User[];
  newPlayers: User[];
  isHost: boolean;

  storySegments: StorySegment[];
  currentVotes: Vote[];
  gameState: GameState;
  loadingStory: boolean;
  currentPlayerIndex: number;
  deadPlayers: string[];
  progress: GameProgress;

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

let presenceChannel: RealtimeChannel | null = null;

export const useGameStore = create<GameStoreState>((set, get) => ({
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
    const allPlayers = players.map(newPlayer => ({
      ...newPlayer,
      status: state.players.find(p => p.id === newPlayer.id)?.status || 'alive'
    }));

    // Auto-start if full group of 4
    if (allPlayers.length === 4 && state.isHost) {
      setTimeout(() => {
        get().startGame();
      }, 1000);
    }

    return {
      players: allPlayers,
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
      if (!state.currentUser) {
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

  createRoom: async (genre, isPublic) => {
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
    if (!userId) throw new Error('Invalid user ID');
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
      .maybeSingle();

    if (existingSession) {
      throw new Error('You are already in an active session.');
    }

    const { error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: userId,
        room_id: room.id
      });

    if (sessionError) throw sessionError;

    const { data: sessionPlayers, error: sessionFetchError } = await supabase
      .from('sessions')
      .select('user_id')
      .eq('room_id', room.id)
      .eq('is_active', true);

    if (sessionFetchError || !sessionPlayers) throw new Error('Failed to fetch session players');

    const userIds = sessionPlayers.map(s => s.user_id);
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', userIds);

    if (profileError) throw profileError;

    const convertedProfiles = profiles.map(p => ({
      id: p.id,
      username: p.username,
      avatar: p.avatar_url,
      oarWalletLinked: false,
      status: 'alive'
    }));

    set({
      currentRoom: {
        ...room,
        genreTag: room.genre_tag
      },
      isHost: room.host_id === userId,
      players: convertedProfiles,
      previousPlayers: convertedProfiles,
      newPlayers: [],
      currentPlayerIndex: 0
    });
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
        p.username === playerName ? { ...p, status: 'dead' } : p
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

  checkGameEnd: () => {
    const state = get();
    const alivePlayers = state.players.filter(p => p.status === 'alive');
    if (alivePlayers.length === 0) {
      set({ gameState: GameState.ENDED, currentPlayerIndex: 0 });
    }
  },

  updateProgress: (updates) =>
    set((state) => ({
      progress: { ...state.progress, ...updates }
    })),

  subscribeToRoom: (roomId: string) => {
    if (presenceChannel) {
      presenceChannel.unsubscribe();
      presenceChannel = null;
    }

    presenceChannel = supabase
      .channel(`room:${roomId}`)
      .on('presence', { event: 'sync' }, async () => {
        const { data: sessions } = await supabase
          .from('sessions')
          .select('user_id')
          .eq('room_id', roomId)
          .eq('is_active', true);

        const ids = sessions?.map((s) => s.user_id) || [];

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', ids);

        const converted = profiles.map(p => ({
          id: p.id,
          username: p.username,
          avatar: p.avatar_url,
          oarWalletLinked: false,
          status: 'alive'
        }));

        get().setPlayers(converted);
      })
      .subscribe();

    return () => {
      presenceChannel?.unsubscribe();
    };
  },

  joinMatchmaking: async (genre: GameGenre) => {
    const { currentUser } = get();
    if (!currentUser) throw new Error('No user logged in');

    const { data: existing } = await supabase
      .from('waiting_pool')
      .select()
      .eq('user_id', currentUser.id)
      .eq('status', 'waiting')
      .maybeSingle();

    if (existing) throw new Error('Already in matchmaking queue');

    const { error } = await supabase
      .from('waiting_pool')
      .insert({
        user_id: currentUser.id,
        genre,
        status: 'waiting'
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
  }
}));
