import { create } from 'zustand';
import { GameGenre, Room, User, StorySegment, Vote, RoomStatus, GameMode } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface GameState {
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
  gameInProgress: boolean;
  loadingStory: boolean;
  currentPlayerIndex: number;

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
  createTempRoom: (genre: GameGenre) => string;
}

export const useGameStore = create<GameState>((set) => ({
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
  gameInProgress: false,
  loadingStory: false,
  currentPlayerIndex: 0,

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
      gameInProgress: true,
      currentRoom: state.currentRoom
        ? { ...state.currentRoom, status: RoomStatus.IN_PROGRESS }
        : null,
      currentPlayerIndex: 0
    })),

  endGame: () =>
    set((state) => ({
      gameInProgress: false,
      currentRoom: state.currentRoom
        ? { ...state.currentRoom, status: RoomStatus.CLOSED }
        : null
    })),

  setLoadingStory: (loading) => set({ loadingStory: loading }),

  setCurrentPlayerIndex: (index) => set({ currentPlayerIndex: index }),

  nextPlayerTurn: () =>
    set((state) => ({
      currentPlayerIndex:
        state.players.length > 0
          ? (state.currentPlayerIndex + 1) % state.players.length
          : 0
    })),

  generateTempUser: (username) =>
    set({
      currentUser: {
        id: uuidv4(),
        username,
        avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`,
        oarWalletLinked: false,
        status: 'alive'
      },
      isAuthenticated: true
    }),

  createTempRoom: (genre) => {
    const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    set((state) => {
      if (!state.currentUser) return {};

      const newRoom: Room = {
        id: uuidv4(),
        code: roomCode,
        status: RoomStatus.OPEN,
        currentNarrativeState: '',
        genreTag: genre,
        createdAt: new Date().toISOString(),
        hostId: state.currentUser.id,
        gameMode: GameMode.FREE_TEXT // Default to free_text
      };

      return {
        currentRoom: newRoom,
        isHost: true,
        players: state.currentUser ? [{ ...state.currentUser, status: 'alive' }] : [],
        previousPlayers: state.currentUser ? [{ ...state.currentUser, status: 'alive' }] : [],
        newPlayers: [],
        currentPlayerIndex: 0
      };
    });

    return roomCode;
  }
}));
