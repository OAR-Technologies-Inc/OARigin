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
  joinMatchmaking: (genre: GameGenre) => Promise<void>;
  leaveMatchmaking: () => Promise<void>;
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
  markPlayerDead: (userId) =>
    set((state) => ({
      deadPlayers: [...state.deadPlayers, userId]
    })),
  setProgress: (progress) => set({ progress }),

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
  }
}));

