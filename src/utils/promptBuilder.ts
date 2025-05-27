interface PromptOptions {
  genre: string;
  players?: string[];
  storyLog?: string[];
  currentPlayer?: string;
  playerInput?: string;
  deadPlayers?: string[];
  newPlayers?: string[];
  gameMode?: 'free_text' | 'multiple_choice';
  tone?: 'tense' | 'hopeful' | 'grim' | 'humorous' | 'neutral';
  playerRoles?: Record<string, string>;
  storyPhase?: 'opening' | 'rising' | 'climax' | 'resolution';
  sessionGoal?: 'short' | 'medium' | 'long' | 'conclude';
}

export function buildNarrationPrompt({
  genre,
  players = [],
  storyLog = [],
  currentPlayer = '',
  playerInput = '',
  deadPlayers = [],
  newPlayers = [],
  gameMode = 'multiple_choice',
  tone = 'neutral',
  playerRoles = {},
  storyPhase = 'opening',
  sessionGoal = 'medium',
}: PromptOptions) {
  const activePlayers = players.filter(p => !deadPlayers.includes(p));
  const partySize = activePlayers.length;
  console.log(`Active players count: ${partySize}`); // Debug log for player count

  const voice =
    activePlayers.length === 0
      ? `Narrate a story conclusion, reflecting on the group's fate.`
      : partySize === 1
      ? `Use second-person narration ("You") for ${activePlayers[0]}.`
      : partySize === 2
      ? `Refer to the players as "you both" or by names: ${activePlayers.join(' and ')}.`
      : `Refer to the group as "your group" or by names: ${activePlayers.join(', ')}.`;

  const introInstruction =
    storyLog.length === 0
      ? `Begin with a vivid introduction (50–100 words) to hook the player${partySize > 1 ? 's' : ''}, setting up the ${storyPhase} phase.`
      : `Continue the story in a concise paragraph (50–100 words) for the ${storyPhase} phase. Keep it ${tone}, reactive, and immersive.`;

  const deadPlayerInstruction = deadPlayers.length > 0
    ? `- If a player has recently died, briefly acknowledge their death in the narrative (e.g., "With ${deadPlayers[deadPlayers.length - 1]} fallen, the group presses on ${tone === 'grim' ? 'somberly' : 'resolutely'}").`
    : '';

  const newPlayerInstruction = newPlayers.length > 0
    ? `- Introduce the new player${newPlayers.length > 1 ? 's' : ''} (${newPlayers.join(', ')}) naturally into the narrative. Describe their arrival or appearance in the story (e.g., "As you explore the forest, you encounter ${newPlayers[0]}, emerging from the shadows with a determined look."). Ensure their introduction fits the ${tone} tone and ${genre} genre.`
    : '';

  const inputInstruction = playerInput.trim().length > 0
    ? `- **Mandatory**: The narrative must directly address and build upon the current player's input ("${playerInput}") from ${currentPlayer}. The story continuation must explicitly reflect their action or decision as the primary driver of the next scene.`
    : `- If the input is empty, advance the story with an environmental event (e.g., "A storm brews, forcing action") relevant to the ${tone} tone and ${storyPhase} phase.`;

  const sessionInstruction = sessionGoal === 'conclude'
    ? `- Conclude the story in this segment, resolving major threads in the ${storyPhase} phase.`
    : `- Pace the story for a ${sessionGoal} session (short: 5–10 minutes, medium: 15–30 minutes, long: 30+ minutes).`;

  const gameModeInstruction = gameMode === 'free_text'
    ? `- Focus on scenario building to provide detailed context for the player${partySize > 1 ? 's' : ''}. Describe the environment, sensory details, and potential challenges or opportunities in vivid detail (e.g., "The air grows colder as you approach the cavern, the sound of dripping water echoing in the darkness. Strange markings on the walls hint at an ancient ritual."). This helps the player${partySize > 1 ? 's' : ''} make informed free-text choices.`
    : `- Include 3–4 distinct choices that advance the story in the ${storyPhase} phase, tailored to the ${tone} tone, genre, and active players' roles. Ensure choices vary in risk, strategy, or outcome, formatted as a numbered list (e.g., "1. Decipher the cryptic symbols\n2. Search for hidden compartments").`;

  const trimmedStory = storyLog
    .slice(-10)
    .map((entry, i) => `${i + 1}. ${entry}`)
    .join('\n') || 'No prior story.';

  const roleContext = activePlayers
    .map(p => `${p}${playerRoles[p] ? ` (${playerRoles[p]})` : ''}`)
    .join(', ') || 'None';

  const prompt = `
Genre: ${genre}

Alive players: ${roleContext}
Dead players: ${deadPlayers.join(', ') || 'None'}
New players to introduce: ${newPlayers.join(', ') || 'None'}

Story so far:
${trimmedStory}

${currentPlayer ? `Current player: ${currentPlayer}${playerRoles[currentPlayer] ? ` (${playerRoles[currentPlayer]})` : ''}\nPlayer input: "${playerInput}"` : `Group input: "${playerInput}"`}

Narration rules:
- ${voice}
- Do not prompt or narrate responses for dead players.
${deadPlayerInstruction}
${newPlayerInstruction}
${inputInstruction}
- Maintain continuity, tone (${tone}), and genre fidelity, emphasizing key events even if not in the recent log.
- ${introInstruction}
- ${sessionInstruction}
${gameModeInstruction}

Continue the story from the narrator’s perspective. Do not break character. Keep it concise and emotionally immersive.
`;

  return prompt.trim();
}