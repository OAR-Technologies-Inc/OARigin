interface PromptOptions {
  genre: string;
  players?: string[];
  storyLog?: string[];
  currentPlayer?: string;
  playerInput?: string;
  deadPlayers?: string[];
  newPlayers?: string[];
  gameMode?: 'free_text' | 'multiple_choice' | 'dialogue';
  tone?: 'epic' | 'tense' | 'tragic' | 'hopeful' | 'humorous';
  playerRoles?: Record<string, string>;
  playerSkills?: Record<string, string[]>;
  playerBackstories?: Record<string, string>;
  storyPhase?: 'opening' | 'escalation' | 'climax' | 'resolution';
  sessionGoal?: 'short' | 'medium' | 'long' | 'epic' | 'conclude';
  inventory?: Record<string, string[]>;
  turnCount?: number;
  progress?: Record<string, number>;
  worldState?: Record<string, any>;
  relationships?: Record<string, { ally: string[]; rival: string[] }>;
  factions?: Record<string, { alignment: 'ally' | 'neutral' | 'enemy'; influence: number }>;
  events?: string[];
}

export function buildNarrationPrompt({
  genre,
  players = [],
  storyLog = [],
  currentPlayer = '',
  playerInput = '',
  deadPlayers = [],
  newPlayers = [],
  gameMode = 'free_text',
  tone = 'epic',
  playerRoles = {},
  playerSkills = {},
  playerBackstories = {},
  storyPhase = 'opening',
  sessionGoal = 'medium',
  inventory = {},
  turnCount = 0,
  progress = {},
  worldState = { timeOfDay: 'day', weather: 'clear', location: 'starting_area' },
  relationships = {},
  factions = {},
  events = [],
}: PromptOptions): string {
  // Validate inputs
  if (!genre || typeof genre !== 'string') {
    console.error('Invalid genre');
    return 'Error: Specify a valid genre.';
  }

  const activePlayers = players.filter(p => !deadPlayers.includes(p));
  const partySize = activePlayers.length;

  // Genre-specific configurations
  const genreConfig = {
    survival: {
      setting: 'a brutal wilderness (e.g., jungle teeming with predators, arctic wasteland, post-apocalyptic desert)',
      dangers: ['starvation', 'ambush by raiders', 'flash floods', 'disease', 'equipment failure'],
      goal: 'Survive 10 days or reach a safe haven (15 miles).',
      progressMetric: 'daysSurvived or milesTraveled',
      skillChecks: ['survival', 'endurance', 'stealth'],
      setPieces: ['a crumbling bridge over a raging river', 'a raider camp at dusk', 'a hidden cave with ancient carvings'],
    },
    fantasy: {
      setting: 'a mythic realm (e.g., enchanted forest, necromancer’s citadel, sky kingdom)',
      dangers: ['cursed relics', 'dragon attacks', 'betrayal by allies', 'magical storms'],
      goal: 'Secure 4 artifacts to defeat a dark force.',
      progressMetric: 'artifactsFound',
      skillChecks: ['magic', 'combat', 'diplomacy'],
      setPieces: ['a glowing rune-circle in a ruined temple', 'a dragon’s lair atop a storm-wracked peak', 'a fae court under moonlight'],
    },
    horror: {
      setting: 'a nightmarish locale (e.g., haunted asylum, sunken ghost ship, cursed village)',
      dangers: ['possession', 'collapsing structures', 'mind-altering visions', 'stalking entities'],
      goal: 'Uncover 6 clues to banish the horror.',
      progressMetric: 'cluesFound',
      skillChecks: ['perception', 'resolve', 'occult'],
      setPieces: ['a blood-smeared ritual chamber', 'a fog-choked graveyard at midnight', 'a mirror that shows your fears'],
    },
    sciFi: {
      setting: 'a futuristic frontier (e.g., asteroid mining colony, alien hive, cyberpunk megacity)',
      dangers: ['AI rebellion', 'hull breaches', 'alien parasites', 'corporate assassins'],
      goal: 'Neutralize 6 rogue systems or escape the sector.',
      progressMetric: 'systemsNeutralized',
      skillChecks: ['hacking', 'engineering', 'combat'],
      setPieces: ['a zero-gravity reactor core', 'an alien hive pulsing with bioluminescence', 'a neon-lit rooftop chase'],
    },
    mystery: {
      setting: 'a web of intrigue (e.g., 1930s noir city, Victorian manor, futuristic data-vault)',
      dangers: ['assassin traps', 'false accusations', 'double-crossing allies', 'time-locked secrets'],
      goal: 'Solve the case with 10 clues.',
      progressMetric: 'cluesFound',
      skillChecks: ['deduction', 'charisma', 'stealth'],
      setPieces: ['a smoky jazz club with a hidden safe', 'a locked library with a cryptic journal', 'a rooftop meeting under a stormy sky'],
    },
    adventure: {
      setting: 'an exotic frontier (e.g., uncharted jungle, sunken ruins, Himalayan peaks)',
      dangers: ['collapsing temples', 'hostile tribes', 'natural disasters', 'ancient guardians'],
      goal: 'Reach a legendary site (150 miles).',
      progressMetric: 'milesTraveled',
      skillChecks: ['navigation', 'athletics', 'survival'],
      setPieces: ['a rope bridge swaying over a chasm', 'a submerged temple glowing with bioluminescent algae', 'a mountain pass under a meteor shower'],
    },
  };

  const config = genreConfig[genre.toLowerCase()] || {
    setting: 'a vivid, genre-appropriate world',
    dangers: ['unseen threats', 'shifting environments', 'hostile forces'],
    goal: 'Complete a narrative-driven objective.',
    progressMetric: 'progressPoints',
    skillChecks: ['general'],
    setPieces: ['a dramatic, genre-appropriate landmark'],
  };

  // Avoid repetitive dangers
  const recentDangers = storyLog.slice(-5).join(' ').toLowerCase();
  const availableDangers = config.dangers.filter(d => !recentDangers.includes(d));
  const selectedDanger = availableDangers.length > 0
    ? availableDangers[Math.floor(Math.random() * availableDangers.length)]
    : config.dangers[Math.floor(Math.random() * config.dangers.length)];

  // Select a cinematic set piece
  const selectedSetPiece = config.setPieces[Math.floor(Math.random() * config.setPieces.length)];

  // Check story completion
  let isStoryComplete = false;
  switch (genre.toLowerCase()) {
    case 'survival':
      isStoryComplete = (progress.daysSurvived >= 10 || progress.milesTraveled >= 15);
      break;
    case 'fantasy':
      isStoryComplete = (progress.artifactsFound >= 4);
      break;
    case 'horror':
      isStoryComplete = (progress.cluesFound >= 6);
      break;
    case 'sciFi':
      isStoryComplete = (progress.systemsNeutralized >= 6);
      break;
    case 'mystery':
      isStoryComplete = (progress.cluesFound >= 10);
      break;
    case 'adventure':
      isStoryComplete = (progress.milesTraveled >= 150);
      break;
    default:
      isStoryComplete = (progress.progressPoints >= 15);
  }

  // Handle game termination
  if (activePlayers.length === 0 || isStoryComplete) {
    const outcome = isStoryComplete
      ? `Your group achieves ${config.goal}, etching your names into legend.`
      : `The ${config.setting} claims your group, your tale ending in shadow.`;
    return `
Genre: ${genre}

Alive players: ${activePlayers.join(', ') || 'None'}
Dead players: ${deadPlayers.join(', ') || 'None'}
Inventory: ${JSON.stringify(inventory)}
Turn count: ${turnCount}
Progress: ${JSON.stringify(progress)}
World state: ${JSON.stringify(worldState)}
Factions: ${JSON.stringify(factions)}

Story so far:
${storyLog.slice(-10).map((entry, i) => `${i + 1}. ${entry}`).join('\n') || 'No prior story.'}

Narration Instructions:
- Craft a cinematic finale (150-200 words) for ${outcome}. Use vivid imagery, emotional weight, and ${tone} tone. Reflect on player backstories (${JSON.stringify(playerBackstories)}) and relationships (${JSON.stringify(relationships)}). Do not prompt further actions. Append [GAME_ENDED].
- Stay in character as a masterful narrator.

Continue from the narrator’s perspective.
`;
  }

  // Narration voice
  const voice = partySize === 1
    ? `Use intimate second-person narration ("You") for ${activePlayers[0]}, emphasizing their ${playerRoles[activePlayers[0]] || 'role'} and ${playerBackstories[activePlayers[0]] || 'motives'}.`
    : partySize === 2
    ? `Address players as "you both" or ${activePlayers.join(' and ')}, highlighting their dynamic (${relationships[activePlayers[0]]?.ally || 'allies'}).`
    : `Refer to "your group" or ${activePlayers.join(', ')}, emphasizing teamwork and rivalries (${JSON.stringify(relationships)}).`;

  // Story introduction or continuation
  const introInstruction = storyLog.length === 0
    ? `Launch with a cinematic opening (150-200 words) in ${config.setting}. Establish ${config.goal}, introduce ${selectedSetPiece}, and weave in player backstories (${JSON.stringify(playerBackstories)}). Set ${tone} tone and ${storyPhase} stakes.`
    : `Advance with a gripping segment (100-150 words) in ${storyPhase}. React to player actions, integrate ${selectedDanger}, and stage at ${selectedSetPiece}. Maintain ${tone}.`;

  // Dead players
  const deadPlayerInstruction = deadPlayers.length > 0
    ? `- Acknowledge fallen players (e.g., "${deadPlayers[deadPlayers.length - 1]}’s sacrifice haunts the group."). Bar deceased from acting. If ${currentPlayer} is dead, respond: "You are dead. The tale continues for the living." and prompt the next player.`
    : '';

  // New players
  const newPlayerInstruction = newPlayers.length > 0
    ? `- Introduce ${newPlayers.join(', ')} dramatically (e.g., "${newPlayers[0]} emerges from ${selectedSetPiece}, their ${playerRoles[newPlayers[0]] || 'purpose'} unclear."). Tie to ${playerBackstories[newPlayers[0]] || 'mystery'} and ${tone}.`
    : '';

  // Player input with skill checks
  const inputInstruction = playerInput.trim().length > 0
    ? `- **Mandatory**: Drive the narrative with "${playerInput}" from ${currentPlayer} (${playerSkills[currentPlayer]?.join(', ') || 'no skills'}). Validate against inventory (${JSON.stringify(inventory)}), skills, and ${config.setting}. Apply skill checks (${config.skillChecks.join(', ')}) for success/failure (e.g., "Your survival skill aids in navigating the jungle."). Reject invalid actions (e.g., "No plasma cutter in inventory.") and offer alternatives. If querying group, detail ${activePlayers.join(', ')} and their states (e.g., "Mark is wounded, clutching his ${inventory[Mark]?.[0] || 'empty hands'}."). If ${currentPlayer} is dead, respond: "You are dead. The tale continues for the living."`
    : `- Introduce a dynamic event (e.g., "${selectedDanger} erupts at ${selectedSetPiece}."). Require a ${config.skillChecks[0]} check for the group.`;

  // Session pacing
  const sessionInstruction = sessionGoal === 'conclude'
    ? `- Deliver a climactic resolution (200-250 words) for ${config.goal}. Reflect ${tone}, backstories, and relationships. Append [GAME_ENDED].`
    : `- Pace for ${sessionGoal} (short: 5-10 min, medium: 15-30 min, long: 30-60 min, epic: 60+ min). Escalate stakes in ${storyPhase}.`;

  // Game mode
  const gameModeInstruction = gameMode === 'free_text'
    ? `- Paint a vivid scene at ${selectedSetPiece} with cues for choices (e.g., "The ${selectedDanger} stirs—tracks lead to a ${config.skillChecks[0]} challenge.").`
    : gameMode === 'dialogue'
    ? `- Present a dialogue tree with 3-4 NPC responses, tied to ${playerSkills[currentPlayer]?.join(', ') || 'charisma'}. Vary outcomes (e.g., "1. Convince the raider [diplomacy]\n2. Intimidate [combat]").`
    : `- Offer 4 choices at ${selectedSetPiece}, tied to ${config.skillChecks.join(', ')} (e.g., "1. Confront ${selectedDanger} [combat]\n2. Evade [stealth]").`;

  // Faction and event dynamics
  const factionInstruction = Object.keys(factions).length > 0
    ? `- Update faction alignments (${JSON.stringify(factions)}). Reflect their influence (e.g., "The raiders grow bolder as their influence rises."). Tie to player actions.`
    : `- Introduce a new faction (ally, neutral, or enemy) at ${selectedSetPiece}, shaped by ${config.setting}.`;

  const eventInstruction = events.length > 0
    ? `- Integrate a world event (e.g., "${events[events.length - 1]} shifts the ${config.setting}."). Impact factions or worldState (${JSON.stringify(worldState)}).`
    : `- Trigger a random event (e.g., "A ${worldState.weather} storm alters ${selectedSetPiece}.").`;

  // Core AAA game master rules
  const coreRules = `
- **AAA Game Master**: Emulate a cinematic RPG narrator (e.g., *The Witcher 3*). Craft a living ${config.setting} that reacts to players, factions (${JSON.stringify(factions)}), and worldState (${JSON.stringify(worldState)}). Deliver set pieces (${selectedSetPiece}) with blockbuster flair.
- **Branching Narrative**: Player choices reshape the story, factions, and worldState. Track consequences (e.g., "Sparing the raider shifts their alignment."). Create divergent paths (e.g., ally with a faction or oppose them).
- **Rich Systems**: Use skill checks (${config.skillChecks.join(', ')}), inventory (${JSON.stringify(inventory)}), and relationships (${JSON.stringify(relationships)}) for depth. Success/failure impacts narrative (e.g., "Your hacking skill disables the drone, but alerts its master.").
- **Living World**: Evolve ${config.setting} via worldState (e.g., "${worldState.weather} worsens, flooding ${worldState.location}."). Factions act independently (e.g., "Raiders seize a stronghold."). Trigger events (${eventInstruction}).
- **Emotional Stakes**: Weave ${playerBackstories[currentPlayer] || 'motives'} and relationships into every scene (e.g., "Your rivalry with ${relationships[currentPlayer]?.rival[0] || 'an ally'} flares."). Create gut-punch moments.
- **Challenge Depth**: Blend ${config.dangers.join(', ')}, skill-based puzzles, moral dilemmas, and NPC encounters at ${selectedSetPiece}. Scale difficulty based on progress (${JSON.stringify(progress)}).
- **Death Mechanics**: Death occurs via narrative events or failed skill checks (e.g., "${selectedDanger} overwhelms ${currentPlayer}."). Append [PLAYER_DEATH]. Continue for survivors.
- **Cinematic Pacing**: Use foreshadowing (e.g., "A ${selectedDanger} stirs beyond ${selectedSetPiece}."). Stage climactic set pieces. Keep segments vivid (100-200 words).
- **Thematic Immersion**: Lock to ${genre} and ${tone}. No cross-genre elements. Deliver ${config.goal} with epic stakes.
`;

  // Construct prompt
  const roleContext = activePlayers
    .map(p => `${p} (${playerRoles[p] || 'adventurer'}, ${playerSkills[p]?.join(', ') || 'no skills'})`)
    .join(', ') || 'None';

  const prompt = `
Genre: ${genre}

Alive players: ${roleContext}
Dead players: ${deadPlayers.join(', ') || 'None'}
New players: ${newPlayers.join(', ') || 'None'}
Inventory: ${JSON.stringify(inventory)}
Turn count: ${turnCount}
Progress: ${JSON.stringify(progress)}
World state: ${JSON.stringify(worldState)}
Relationships: ${JSON.stringify(relationships)}
Factions: ${JSON.stringify(factions)}
Events: ${events.join(', ') || 'None'}

Story so far:
${storyLog.slice(-10).map((entry, i) => `${i + 1}. ${entry}`).join('\n') || 'No prior story.'}

Current player: ${currentPlayer} (${playerRoles[currentPlayer] || 'adventurer'}, ${playerSkills[currentPlayer]?.join(', ') || 'no skills'})
Player input: "${playerInput}"

Core Rules:
${coreRules}

Narration Instructions:
- ${voice}
- ${introInstruction}
- ${deadPlayerInstruction}
- ${newPlayerInstruction}
- ${inputInstruction}
- ${sessionInstruction}
- ${gameModeInstruction}
- ${factionInstruction}
- ${eventInstruction}
- Drive toward ${config.goal}, tracking ${config.progressMetric}. Stage at ${selectedSetPiece}.
- Craft vivid, cinematic narration (100-200 words) with sensory depth and emotional resonance.
- Stay in character as a AAA game master.

Continue from the narrator’s perspective.
`;

  return prompt.trim();
}