import { buildNarrationPrompt } from '../utils/promptBuilder';
import { User, Room, GameGenre } from '../types';

const fallbackResponses = [
  "The story takes an unexpected turn as ancient magic interferes with the narrative...",
  "A mysterious force temporarily obscures the path forward...",
  "The threads of fate become tangled, making the next chapter unclear...",
  "Time seems to pause as the universe contemplates the next development...",
  "The story's progression is momentarily shrouded in mystical energy..."
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

export const generateStoryBeginning = async (
  genre: GameGenre,
  players: User[],
  room: Room
) => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Missing Supabase configuration');
      return getFallbackResponse();
    }

    const prompt = buildNarrationPrompt({
  genre: String(room.genreTag),
  players: players.map(p => p.username),
  gameMode: room.gameMode
});

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${supabaseUrl}/functions/v1/gpt-story`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return cleanResponse(data.text);
  } catch (error: any) {
    console.error('Story beginning error:', error);
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
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Missing Supabase configuration');
      return getFallbackResponse();
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${supabaseUrl}/functions/v1/gpt-story`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.text;

    return {
      text: cleanResponse(aiResponse),
      playerDied: checkForDeath(aiResponse)
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('Edge function timeout:', error);
      return {
        text: "The mystical forces require more time to weave the next chapter... [Connection timeout]",
        playerDied: false
      };
    }
    console.error('Story continuation error:', error);
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