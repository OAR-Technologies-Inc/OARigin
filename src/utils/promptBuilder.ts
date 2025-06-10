interface PlayerProfile {
  personalityType: 'cautious' | 'aggressive' | 'clever' | 'naive' | 'loyal' | 'selfish';
  decisionPattern: string[];
  interpersonalTies: Record<string, 'trust' | 'distrust' | 'neutral'>;
  injuryStatus: 'healthy' | 'bleeding' | 'limping' | 'hallucinating' | 'infected' | 'critical';
  role: string;
  skills: string[];
  backstory: string;
}

interface DeadPlayer {
  cause: string;
  lastWords?: string;
}

interface PromptOptions {
  genre: string;
  players: Record<string, PlayerProfile>;
  storyLog: string[];
  currentPlayer: string;
  playerInput: string;
  deadPlayers: Record<string, DeadPlayer>;
  newPlayers: string[];
  gameMode: 'free_text' | 'multiple_choice' | 'dialogue';
  voiceStyle: 'noir' | 'cinematic' | 'poetic' | 'brutalist';
  narrativeFocus: 'environment' | 'psychology' | 'group_tension' | 'mystery';
  gmIntent: 'paranoia' | 'hope' | 'urgency' | 'dread';
  location: string;
  situation: string;
  stakes: string;
  groupState: { fatigue: number; morale: number; hunger: number; cohesion: number };
  environmentMood: string;
  inventory: Record<string, string[]>;
  turnCount: number;
  progress: Record<string, number>;
  worldState: Record<string, any>;
  pacingLevel: 'slow' | 'medium' | 'high';
  timeSinceLastEvent: number;
  timeUntilClimax: number;
}

export function buildNarrationPrompt({
  genre,
  players = {},
  storyLog = [],
  currentPlayer = '',
  playerInput = '',
  deadPlayers = {},
  newPlayers = [],
  gameMode = 'free_text',
  voiceStyle = 'cinematic',
  narrativeFocus = 'mystery',
  gmIntent = 'dread',
  location = 'unknown',
  situation = 'calm',
  stakes = 'survival',
  groupState = { fatigue: 0, morale: 50, hunger: 0, cohesion: 50 },
  environmentMood = 'neutral',
  inventory = {},
  turnCount = 0,
  progress = { cluesFound: 0 },
  worldState = { timeOfDay: 'day', weather: 'clear' },
  pacingLevel = 'slow',
  timeSinceLastEvent = 0,
  timeUntilClimax = 20,
}: PromptOptions): string {
  if (!genre || typeof genre !== 'string') {
    console.error('Invalid genre');
    return 'Error: Specify a valid genre.';
  }

  const activePlayers = Object.keys(players).filter(p => !deadPlayers[p]);
  const partySize = activePlayers.length;

  // Mystery-specific configuration
  const config = {
    setting: 'a Victorian manor cloaked in fog and deceit',
    dangerThemes: ['booby-trapped rooms', 'deceptive servants', 'shadowy assailants', 'unsolved riddles'],
    goal: 'Uncover 10 clues to solve Lord Harroway’s murder before midnight.',
    progressMetric: 'cluesFound',
    skillChecks: ['deduction', 'perception', 'charisma', 'stealth'],
    setPieces: ['locked library with a cryptic journal', 'ballroom with a hidden safe', 'garden maze with a stained statue'],
    npcs: [
      { name: 'Maid Clara', motive: 'hides a lover’s secret', trust: 'questionable', location: 'hallway' },
      { name: 'Butler Grayson', motive: 'guards manor secrets', trust: 'neutral', location: 'foyer' },
    ],
    events: [
      'A scream echoes from the upper floors.',
      'The fog thickens, obscuring the garden.',
      'A chandelier crashes, blocking a hallway.',
    ],
  };

  // Select dynamic danger theme
  const recentDangers = storyLog.slice(-5).join(' ').toLowerCase();
  const availableDangers = config.dangerThemes.filter(d => !recentDangers.includes(d));
  const selectedDanger = availableDangers.length > 0
    ? availableDangers[Math.floor(Math.random() * availableDangers.length)]
    : config.dangerThemes[Math.floor(Math.random() * config.dangerThemes.length)];

  // Select set piece
  const selectedSetPiece = config.setPieces[Math.floor(Math.random() * config.setPieces.length)];

  // Auto-generate event every 3-4 turns
  const shouldTriggerEvent = timeSinceLastEvent >= 3 || Math.random() < 0.25;
  const selectedEvent = shouldTriggerEvent ? config.events[Math.floor(Math.random() * config.events.length)] : null;

  // Check story completion
  const isStoryComplete = progress.cluesFound >= 10;

  // Determine ending type
  const endingType = isStoryComplete
    ? groupState.cohesion > 70
      ? 'heroic_victory'
      : groupState.morale < 30
      ? 'corrupted_win'
      : 'bittersweet_escape'
    : activePlayers.length === 0
    ? 'total_failure'
    : null;

  // Handle game termination
  if (endingType) {
    const outcomeMap = {
      heroic_victory: `Your group unveils the killer, justice shining through the manor’s fog.`,
      bittersweet_escape: `You escape with the truth, but leave a fallen ally behind.`,
      corrupted_win: `You solve the murder, but at a moral cost, tainted by your choices.`,
      total_failure: `The manor’s secrets consume your group, the killer vanishing into the night.`,
    };
    return `
Genre: mystery

Alive players: ${activePlayers.join(', ') || 'None'}
Dead players: ${Object.entries(deadPlayers).map(([p, d]) => `${p} (${d.cause})`).join(', ') || 'None'}
Inventory: ${JSON.stringify(inventory)}
Turn count: ${turnCount}
Progress: ${JSON.stringify(progress)}
World state: ${JSON.stringify(worldState)}
Group state: ${JSON.stringify(groupState)}

Story so far:
${storyLog.slice(-10).map((entry, i) => `${i + 1}. ${entry}`).join('\n') || 'No prior story.'}

Narration Instructions:
- Craft a cinematic epilogue (200-250 words) for "${outcomeMap[endingType]}". Reflect ${players[currentPlayer]?.backstory || 'motives'}, ${JSON.stringify(players)}. Use ${voiceStyle} style, ${narrativeFocus} focus, and ${gmIntent} intent. Include per-player outcomes based on ${JSON.stringify(players)}. Append [GAME_ENDED].
- Stay in character as a masterful narrator.

Continue from the narrator’s perspective.
`;
  }

  // Narration voice
  const voice = partySize === 1
    ? `Use intimate second-person narration for ${currentPlayer}, emphasizing their ${players[currentPlayer]?.backstory || 'quest'}.`
    : `Address "your group" or ${activePlayers.join(', ')}, highlighting ${JSON.stringify(players)} ties.`;

  // Story introduction or continuation
  const introInstruction = storyLog.length === 0
    ? `Open with a 150-200 word scene in ${config.setting} at ${location}. Establish ${config.goal}, stage ${selectedSetPiece}, and set ${situation} with ${stakes}. Use ${voiceStyle} style and ${environmentMood} mood.`
    : `Advance with a 100-150 word segment in ${storyPhase} at ${location}. React to "${playerInput}", stage ${selectedSetPiece}, and escalate ${situation} with ${stakes}. Maintain ${voiceStyle} and ${environmentMood}.`;

  // Dead players
  const deadPlayerInstruction = Object.keys(deadPlayers).length > 0
    ? `- Acknowledge deaths (e.g., "${Object.keys(deadPlayers)[Object.keys(deadPlayers).length - 1]} fell to ${deadPlayers[Object.keys(deadPlayers)[Object.keys(deadPlayers).length - 1]]?.cause}"). Block deceased from acting. If ${currentPlayer} is dead, respond: "You are dead, lost to ${deadPlayers[currentPlayer]?.cause}. The mystery continues." and prompt the next player.`
    : '';

  // New players
  const newPlayerInstruction = newPlayers.length > 0
    ? `- Introduce ${newPlayers.join(', ')} at ${selectedSetPiece} (e.g., "${newPlayers[0]} emerges, their ${players[newPlayers[0]]?.role || 'intent'} shrouded."). Tie to ${players[newPlayers[0]]?.backstory || 'mystery'}.`
    : '';

  // Player input with skill checks
  const inputInstruction = playerInput.trim().length > 0
    ? `- **Mandatory**: Shape the narrative around "${playerInput}" from ${currentPlayer} (${players[currentPlayer]?.skills.join(', ') || 'no skills'}, ${players[currentPlayer]?.injuryStatus}). Validate against ${JSON.stringify(inventory)}, ${config.skillChecks.join(', ')}, and ${location}. Use skill checks for outcomes (e.g., "${players[currentPlayer]?.skills.includes('perception') ? 'Your perception spots a trap' : 'You miss the trap’s trigger'}."). Reflect ${players[currentPlayer]?.personalityType} and ${JSON.stringify(players[currentPlayer]?.interpersonalTies)}. Reject invalid actions (e.g., "No lockpick."). If querying group, detail ${activePlayers.map(p => `${p} (${players[p].injuryStatus})`).join(', ')}. If ${currentPlayer} is dead, respond: "You are dead, lost to ${deadPlayers[currentPlayer]?.cause}."`
    : `- Trigger ${selectedDanger} at ${selectedSetPiece} (e.g., "${selectedDanger} emerges."). Require a ${config.skillChecks[0]} check, influenced by ${groupState.cohesion}.`;

  // Event trigger
  const eventInstruction = selectedEvent
    ? `- Integrate "${selectedEvent}" into ${selectedSetPiece}, impacting ${situation} and ${stakes} (e.g., "The scream heightens dread."). Adjust ${groupState.morale} or ${groupState.fatigue}.`
    : `- Foreshadow a future event (e.g., "A distant creak suggests ${config.events[0]}.")`;

  // Pacing and group state
  const pacingInstruction = `
- Pace for ${pacingLevel} intensity (${pacingLevel === 'slow' ? 'exploration-focused' : pacingLevel === 'medium' ? 'tension-building' : 'high-stakes action'}). With ${timeUntilClimax} turns to climax, ${gmIntent === 'urgency' ? 'push desperate options' : 'build suspense'}. Adjust narration urgency based on ${groupState.morale} morale and ${groupState.fatigue} fatigue.`;

  // Game mode
  const gameModeInstruction = gameMode === 'free_text'
    ? `- Paint ${selectedSetPiece} with cues for ${situation} (e.g., "${selectedDanger} looms—${config.skillChecks[0]} might help."). Reflect ${environmentMood}.`
    : gameMode === 'dialogue'
    ? `- Offer 3-4 dialogue options with ${config.npcs[0].name}, tied to ${players[currentPlayer]?.skills.join(', ') || 'charisma'} and ${players[currentPlayer]?.interpersonalTies[config.npcs[0].name] || 'neutral'} (e.g., "1. Charm Clara [charisma]\n2. Sneak past [stealth]").`
    : `- Provide 4 choices at ${selectedSetPiece} (e.g., "1. Confront ${selectedDanger} [${config.skillChecks[0]}]\n2. Search for clues [deduction]"). Scale risk with ${groupState.cohesion}.`;

  // Core rules
  const coreRules = `
- **AAA Dungeon Master**: Craft a *Sherlock Holmes*-caliber mystery in ${config.setting} at ${location}. Deliver ${selectedSetPiece} with ${voiceStyle} flair, driven by ${situation} and ${stakes}. Evolve via ${JSON.stringify(worldState)}.
- **Branching Narrative**: "${playerInput}" reshapes ${config.goal}, ${JSON.stringify(players)}, and ${groupState.cohesion}. Track ${players[currentPlayer]?.decisionPattern || 'choices'} for consequences.
- **Rich Systems**: Use ${config.skillChecks.join(', ')}, ${JSON.stringify(inventory)}, and ${JSON.stringify(config.npcs)}. Outcomes reflect ${players[currentPlayer]?.injuryStatus || 'health'}.
- **Living World**: Update ${worldState.weather} and ${worldState.timeOfDay} (e.g., "Night deepens, fog thickens."). NPCs shift via ${JSON.stringify(config.npcs)}.
- **Emotional Stakes**: Tie ${players[currentPlayer]?.backstory || 'motives'} to ${stakes}. Reflect ${JSON.stringify(players[currentPlayer]?.interpersonalTies)} (e.g., "${currentPlayer} distrusts Sarah"). ${gmIntent} drives tone.
- **Challenge Depth**: Blend ${config.dangerThemes.join(', ')}, riddles, and NPC deceit at ${selectedSetPiece}. Scale with ${progress.cluesFound}/10.
- **Death Mechanics**: Death via ${selectedDanger} or failed checks (e.g., "${selectedDanger} claims ${currentPlayer}."). Record in ${JSON.stringify(deadPlayers)} with cause. Append [PLAYER_DEATH]. Continue for survivors.
- **Cinematic Pacing**: Foreshadow ${selectedDanger} (e.g., "A click hints at ${selectedDanger}."). Deliver 100-200 word segments with ${narrativeFocus} focus.
- **Thematic Immersion**: Lock to mystery, ${voiceStyle}, and ${gmIntent}. Drive ${config.goal}.
`;

  // Construct prompt
  const roleContext = activePlayers
    .map(p => `${p} (${players[p].role}, ${players[p].injuryStatus}, ${players[p].personalityType})`)
    .join(', ') || 'None';

  const prompt = `
Genre: mystery

Alive players: ${roleContext}
Dead players: ${Object.entries(deadPlayers).map(([p, d]) => `${p} (${d.cause}${d.lastWords ? `, "${d.lastWords}"` : ''})`).join(', ') || 'None'}
New players: ${newPlayers.join(', ') || 'None'}
Inventory: ${JSON.stringify(inventory)}
Turn count: ${turnCount}
Progress: ${JSON.stringify(progress)}
World state: ${JSON.stringify(worldState)}
Group state: ${JSON.stringify(groupState)}

Story so far:
${storyLog.slice(-10).map((entry, i) => `${i + 1}. ${entry}`).join('\n') || 'No prior story.'}

Current player: ${currentPlayer} (${players[currentPlayer]?.role || 'investigator'}, ${players[currentPlayer]?.injuryStatus || 'healthy'}, ${players[currentPlayer]?.personalityType || 'neutral'})
Player input: "${playerInput}"

Core Rules:
${coreRules}

Narration Instructions:
- ${voice}
- ${introInstruction}
- ${deadPlayerInstruction}
- ${newPlayerInstruction}
- ${inputInstruction}
- ${eventInstruction}
- ${pacingInstruction}
- ${gameModeInstruction}
- Drive toward ${config.goal}, tracking ${config.progressMetric} (${progress.cluesFound}/10). Stage at ${selectedSetPiece}.
- Craft vivid 100-200 word narration with ${narrativeFocus} focus, ${voiceStyle} style, and ${gmIntent} intent.
- Stay in character as a AAA Dungeon Master.

Continue from the narrator’s perspective.
`;
  return prompt.trim();
}