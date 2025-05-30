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
  joinMatchmaking: (genre: GameGenre) => Promise<void>;
  leaveMatchmaking: () => Promise<void>;
  createRoom: (genre: GameGenre, isPublic: boolean) => Promise<void>;
  joinRoom: (userId: string, roomCode: string) => Promise<void>;
}

export const useGameStore = create<GameStore>((set, get) => ({
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

  startGame: () => set((state) => ({
    gameState: GameState.PLAYING,
    currentRoom: state.currentRoom
      ? { ...state.currentRoom, status: RoomStatus.IN_PROGRESS }
      : null,
    currentPlayerIndex: 0,
    deadPlayers: [],
    progress: {}
  })),

  markPlayerDead: (userId) => set((state) => ({
    deadPlayers: [...state.deadPlayers, userId]
  })),

  setProgress: (progress) => set({ progress }),

  updateProgress: (progress) => set((state) => ({
    progress: { ...state.progress, ...progress }
  })),

  nextPlayerTurn: () => set((state) => ({
    currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
  })),

  checkGameEnd: () => set((state) => {
    const allDead = state.players.every(p => state.deadPlayers.includes(p.id));
    if (allDead) {
      return { gameState: GameState.ENDED };
    }
    return state;
  }),

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
      return;
    }

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
  },

  createRoom: async (genre: GameGenre, isPublic: boolean) => {
    const { currentUser } = get();
    if (!currentUser) throw new Error('No user logged in');

    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data: room, error } = await supabase
      .from('rooms')
      .insert({
        id: uuidv4(),
        code: roomCode,
        genre_tag: genre,
        status: RoomStatus.LOBBY,
        host_id: currentUser.id,
        is_public: isPublic,
        game_mode: 'free_text'
      })
      .select()
      .single();

    if (error) throw error;

    const { error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: currentUser.id,
        room_id: room.id,
        is_active: true
      });

    if (sessionError) throw sessionError;

    set({
      currentRoom: room,
      players: [currentUser],
      isHost: true,
      gameState: GameState.LOBBY
    });
  },

  joinRoom: async (userId: string, roomCode: string) => {
    const { data: room, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', roomCode)
      .eq('status', RoomStatus.LOBBY)
      .single();

    if (error || !room) throw new Error('Room not found or no longer available');

    const { error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: userId,
        room_id: room.id,
        is_active: true
      });

    if (sessionError) throw sessionError;

    const { data: players } = await supabase
      .from('sessions')
      .select('user_id')
      .eq('room_id', room.id)
      .eq('is_active', true);

    const isHost = room.host_id === userId;

    set({
      currentRoom: room,
      players: players?.map(p => ({
        id: p.user_id,
        username: 'Player',
        avatar: '',
        status: 'alive'
      })) || [],
      isHost,
      gameState: GameState.LOBBY
    });
  }
}));