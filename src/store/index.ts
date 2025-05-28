import { create } from 'zustand';
import { GameGenre, Room, User, StorySegment, Vote, RoomStatus, GameMode, GameState, GameProgress } from '../types';
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
  createTempRoom: (genre: GameGenre) => string;
  setPlayerDeath: (playerName: string) => void;
  checkGameEnd: () => void;
  updateProgress: (updates: Partial<GameProgress>) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
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
        return { currentPlayerIndex: 0 };
      }
      
      let nextIndex = state.currentPlayerIndex;
      do {
        nextIndex = (nextIndex + 1) % state.players.length;
      } while (state.players[nextIndex].status === 'dead' && nextIndex !== state.currentPlayerIndex);
      
      return { currentPlayerIndex: nextIndex };
    }),

  setPlayerDeath: (playerName) =>
    set((state) => {
      const player = state.players.find(p => p.username === playerName);
      if (!player) return state;

      const updatedPlayers = state.players.map(p =>
        p.username === playerName ? { ...p, status: 'dead' as const } : p
      );

      return {
        players: updatedPlayers,
        deadPlayers: [...state.deadPlayers, playerName]
      };
    }),

  checkGameEnd: () =>
    set((state) => {
      const alivePlayers = state.players.filter(p => p.status === 'alive');
      if (alivePlayers.length === 0) {
        return { gameState: GameState.ENDED };
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

      return shouldEnd ? { gameState: GameState.ENDED } : state;
    }),

  updateProgress: (updates) =>
    set((state) => ({
      progress: { ...state.progress, ...updates }
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
        gameMode: GameMode.FREE_TEXT
      };

      return {
        currentRoom: newRoom,
        isHost: true,
        players: state.currentUser ? [{ ...state.currentUser, status: 'alive' }] : [],
        previousPlayers: state.currentUser ? [{ ...state.currentUser, status: 'alive' }] : [],
        newPlayers: [],
        currentPlayerIndex: 0,
        gameState: GameState.PLAYING,
        deadPlayers: [],
        progress: {}
      };
    });

    return roomCode;
  }
}));