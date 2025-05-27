import { GameGenre } from '../types';
import { buildNarrationPrompt } from './promptBuilder';

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

// Generate a story beginning
export const generateStoryBeginning = async (
  genre: GameGenre,
  players: string[],
  gameMode: 'free_text' | 'multiple_choice'
) => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Missing Supabase configuration');
      return getFallbackResponse();
    }

    const partySize = players.length;
    const playerNames = players.join(', ');

    const voice =
      partySize === 1
        ? 'Use second-person perspective ("You").'
        : partySize === 2
        ? 'Refer to them collectively as "you both" or by name.'
        : 'Refer to them as "your group", "you all", or by name.';

    const bannedNames = [
      'Eldoria', 'Ironwood', 'Ravensreach', 'Arcanvale', 'Veloria',
      'Drakmor', 'Mythglen', 'Shadowfen', 'Stormhold'
    ];

    const settingSeeds = [
      'a submerged city only visible at dusk',
      'a cursed forest frozen mid-thunderstorm',
      'a spiraling tower that bleeds light',
      'a mirror world trapped inside a library',
      'a ghost town built entirely from salt'
    ];
    const randomSetting = settingSeeds[Math.floor(Math.random() * settingSeeds.length)];

    const prompt = `
Start a new ${genre} adventure for ${partySize} player${partySize > 1 ? 's' : ''}: ${playerNames}.
${voice}
The story begins in ${randomSetting}.

🚫 Do NOT use generic or common fantasy place names.
Specifically avoid: ${bannedNames.join(', ')}.
Invent new, vivid locations, people, and threats. Prioritize originality.

Begin with tension, awe, or urgency. Pull the players in with immediate stakes or danger.
Make the world react to the size of the party and acknowledge their presence naturally.
`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${supabaseUrl}/functions/v1/gpt-story`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        prompt: buildNarrationPrompt({
          genre,
          players: playerNames.split(', '),
          gameMode,
          storyPhase: 'opening'
        })
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error: any) {
    console.error('Story beginning error:', error);
    return getFallbackResponse();
  }
};

// Generate a continuation using full game context
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
    return data.text;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('Edge function timeout:', error);
      return "The mystical forces require more time to weave the next chapter... [Connection timeout]";
    }
    console.error('Story continuation error:', error);
    return getFallbackResponse();
  }
};

// Optional: delay utility
export const simulateAiProcessing = (
  callback: () => void,
  minDelay = 1000,
  maxDelay = 3000
) => {
  const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
  setTimeout(callback, delay);
};