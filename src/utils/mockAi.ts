import { buildNarrationPrompt } from '../utils/promptBuilder';
import { User, Room, GameGenre } from '../types';

const fallbackResponses = [
  "The story takes an unexpected turn as ancient magic interferes... [Retry or check connection]",
  "A mysterious force obscures the path forward... [Retry or check connection]",
  "The threads of fate tangle, pausing the narrative... [Retry or check connection]",
  "Time pauses as the universe reconsiders the tale... [Retry or check connection]",
  "Mystical energy shrouds the story's progression... [Retry or check connection]"
];

const getFallbackResponse = () => {
  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
};

const checkForDeath = (response: string): boolean => {
  const deathPhrases = [
    'you have died',
    'your life ends',
    'death claims you',
    'your journey ends here',
    '[PLAYER_DEATH]',
    'succumb to your wounds',
    'breathe your last breath',
    'your tale comes to a tragic end'
  ];
  return deathPhrases.some(phrase => response.toLowerCase().includes(phrase));
};

const cleanResponse = (response: string, gameMode: string): string => {
  let cleaned = response.replace(/\[PLAYER_DEATH\]/g, '').trim();
  if (gameMode === 'free_text') {
    cleaned = cleaned.replace(/\s*Choices:\s*\n?|\d+\.\s*.+\n?/g, '');
  }
  return cleaned;
};

const fetchWithRetry = async (url: string, options: RequestInit, retries: number = 3, timeout: number = 20000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error(`Attempt ${attempt} failed:`, {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
      if (attempt === retries || error.name !== 'AbortError') {
        throw error;
      }
    }
  }
  throw new Error('Max retries reached');
};

export const generateStoryBeginning = async (
  genre: string,
  players: User[],
  room: Room
) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Missing Supabase configuration');
    return getFallbackResponse();
  }

  const gameMode = room.gameMode || 'free_text';
  const prompt = buildNarrationPrompt({
    genre: String(genre),
    players: players.map(p => p.username),
    storyLog: [],
    currentPlayer: '',
    playerInput: '',
    deadPlayers: [],
    newPlayers: [],
    gameMode,
    tone: 'tense',
    playerRoles: {},
    storyPhase: 'opening',
    sessionGoal: 'medium',
    inventory: [],
    turnCount: 0,
    progress: {},
    responseFormat: gameMode === 'free_text'
      ? 'narrative text without numbered options. Do not include choices or numbered lists.'
      : 'narrative text followed by 3-5 numbered options in the format: Choices:\n1. Option\n2. Option'
  });

  try {
    const response = await fetchWithRetry(
      `${supabaseUrl}/functions/v1/gpt-story`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      },
      3,
      20000
    );

    return cleanResponse(response.text, gameMode);
  } catch (error: any) {
    console.error('Story beginning error:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prompt,
    });
    return getFallbackResponse();
  }
};

export const generateStoryContinuation = async ({
  genre,
  players,
  storyLog = [],
  currentPlayer,
  playerInput,
  deadPlayers = [],
  newPlayers = [],
  gameMode
}: {
  genre: GameGenre;
  players: string[];
  storyLog?: string[];
  currentPlayer: string;
  playerInput: string;
  deadPlayers?: string[];
  newPlayers?: string[];
  gameMode: 'free_text' | 'multiple_choice';
}) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Missing Supabase configuration');
    return {
      text: getFallbackResponse(),
      playerDied: false
    };
  }

  const prompt = buildNarrationPrompt({
    genre,
    players,
    storyLog,
    currentPlayer,
    playerInput,
    deadPlayers,
    newPlayers,
    gameMode,
    responseFormat: gameMode === 'free_text'
      ? 'narrative text without numbered options. Do not include choices or numbered lists.'
      : 'narrative text followed by 3-5 numbered options in the format: Choices:\n1. Option\n2. Option'
  });

  try {
    const response = await fetchWithRetry(
      `${supabaseUrl}/functions/v1/gpt-story`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, playerInput, gameMode }),
      },
      3,
      20000
    );

    const aiResponse = response.text || '';
    console.log('----Story Continuation Raw Response----');
    console.log('response:', response);
    console.log('aiResponse:', aiResponse);

    return {
      text: cleanResponse(aiResponse, gameMode),
      playerDied: checkForDeath(aiResponse)
    };
  } catch (error: any) {
    console.error('Story continuation error:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      prompt,
      playerInput,
      gameMode,
    });
    return {
      text: "The story pauses... [Connection error, please try again]",
      playerDied: false
    };
  }
};

export const simulateAiProcessing = (
  callback: () => void,
  minDelay = 1000,
  maxDelay = 3000
) => {
  const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
  setTimeout(callback, delay);
};