import { buildNarrationPrompt } from '../utils/promptBuilder';
import { User, Room, GameGenre } from '../types';

const fallbackResponses = [
  "The story takes an unexpected turn as ancient magic interferes with the narrative... [Retry or check connection]",
  "A mysterious force temporarily obscures the path forward... [Retry or check connection]",
  "The threads of fate become tangled, making the next chapter unclear... [Retry or check connection]",
  "Time seems to pause as the universe contemplates the next development... [Retry or check connection]",
  "The story's progression is momentarily shrouded in mystical energy... [Retry or check connection]"
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

const cleanResponse = (response: string): string => {
  return response.replace(/\[PLAYER_DEATH\]/g, '').trim();
};

const fetchWithRetry = async (url: string, options: RequestInit, retries: number = 2, timeout: number = 15000) => {
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
      console.error(`Attempt ${attempt} failed:`, error);
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

  const prompt = buildNarrationPrompt({
    genre: String(genre),
    players: players.map(p => p.username),
    storyLog: [],
    currentPlayer: '',
    playerInput: '',
    deadPlayers: [],
    newPlayers: [],
    gameMode: room.gameMode,
    tone: 'tense',
    playerRoles: {},
    storyPhase: 'opening',
    sessionGoal: 'medium',
    inventory: [],
    turnCount: 0,
    progress: {},
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
      2,
      15000
    );

    return cleanResponse(response.text);
  } catch (error: any) {
    console.error('Story beginning error:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
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
  gameMode = 'multiple_choice'
}: {
  genre: GameGenre;
  players: string[];
  storyLog?: string[];
  currentPlayer: string;
  playerInput: string;
  deadPlayers?: string[];
  newPlayers?: string[];
  gameMode?: 'free_text' | 'multiple_choice';
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
    gameMode
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
      2,
      15000
    );

    const aiResponse = response.text;
    return {
      text: cleanResponse(aiResponse),
      playerDied: checkForDeath(aiResponse)
    };
  } catch (error: any) {
    console.error('Story continuation error:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
    if (error.name === 'AbortError') {
      return {
        text: "The mystical forces require more time to weave the next chapter... [Connection timeout]",
        playerDied: false
      };
    }
    return {
      text: getFallbackResponse(),
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