export enum GameGenre {
  FANTASY = 'Fantasy',
  SCI_FI = 'Sci-Fi',
  MYSTERY = 'Mystery',
  HORROR = 'Horror',
  ADVENTURE = 'Adventure',
  SURVIVAL = 'Survival'
}

export enum RoomStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  CLOSED = 'closed'
}

export enum DecisionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  FREESTYLE = 'freestyle'
}

export enum GameMode {
  FREE_TEXT = 'free_text',
  MULTIPLE_CHOICE = 'multiple_choice'
}

export enum GameState {
  PLAYING = 'playing',
  ENDED = 'ended'
}

export interface GameProgress {
  daysSurvived?: number;
  milesTraveled?: number;
  artifactsFound?: number;
  cluesFound?: number;
  nodesDisabled?: number;
  distanceCovered?: number;
}

export interface User {
  id: string;
  username: string;
  avatar: string;
  oarWalletLinked?: boolean;
  status: 'alive' | 'dead';
}

export interface Room {
  id: string;
  code: string;
  status: RoomStatus;
  currentNarrativeState: string;
  genreTag: GameGenre;
  createdAt: string;
  hostId: string;
  gameMode: GameMode;
}

export interface PlayerInRoom {
  userId: string;
  roomId: string;
  joinedAt: string;
}

export interface StorySegment {
  id: string;
  roomId: string;
  content: string;
  aiResponse: string;
  decisionType: DecisionType;
  options?: string[];
  createdAt: string;
}

export interface Vote {
  id: string;
  userId: string;
  storySegmentId: string;
  choice: string | number;
  createdAt: string;
}

export interface Transcript {
  id: string;
  roomId: string;
  content: string;
  completedAt: string;
}