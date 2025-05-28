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
  inventory?: string[]; // New: Track player inventory
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
  inventory = [], // Default to empty inventory
}: PromptOptions) {
  const activePlayers = players.filter(p => !deadPlayers.includes(p));
  const partySize = activePlayers.length;
  console.log(`Active players count: ${partySize}`);

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
    ? `- **Mandatory**: The narrative must directly address and build upon the current player's input ("${playerInput}") from ${currentPlayer}. The story continuation must explicitly reflect their action or decision as the primary driver of the next scene. However, ensure the action is realistic and logical based on the current scenario and the player's inventory (${inventory.join(', ') || 'empty'}). If the player attempts to use an item they don’t have (e.g., "I use a knife" when a knife isn’t in their inventory), respond with a rejection (e.g., "You don’t have a knife.") and suggest alternative actions based on their inventory or environment.`
    : `- If the input is empty, advance the story with an environmental event (e.g., "A storm brews, forcing action") relevant to the ${tone} tone and ${storyPhase} phase.`;

  const sessionInstruction = sessionGoal === 'conclude'
    ? `- Conclude the story in this segment, resolving major threads in the ${storyPhase} phase.`
    : `- Pace the story for a ${sessionGoal} session (short: 5–10 minutes, medium: 15–30 minutes, long: 30+ minutes).`;

  // Mode-specific instructions with logical prerequisites
  let modeInstruction = '';
  switch (genre.toLowerCase()) {
    case 'survival':
      modeInstruction = `
- **Survival Mode**: Place the player${partySize > 1 ? 's' : ''} in a random, challenging scenario (e.g., a forest after a plane crash, a desert island, an arctic tundra). Start with a limited inventory (e.g., a broken watch, a water bottle, a piece of flint) and describe the environment in detail, including potential items they can find or interact with (e.g., "You see a sharp rock near the wreckage, a fallen branch, and a muddy stream."). Players must collect or craft items through narrative interactions (e.g., "You can try to sharpen the branch with the rock to make a spear."). Reject actions that use items not in their inventory (e.g., "You don’t have a knife.") and suggest logical alternatives based on the environment and their current inventory (${inventory.join(', ') || 'empty'}).`;
      break;
    case 'fantasy':
      modeInstruction = `
- **Fantasy Mode**: Place the player${partySize > 1 ? 's' : ''} in a medieval fantasy setting (e.g., a cursed kingdom, an enchanted forest, a dragon’s lair). Start with a basic inventory (e.g., a rusty sword, a tattered cloak, a healing herb) and describe the magical environment, including potential items or resources (e.g., "A glowing crystal lies in the grass, a rusty shield leans against a tree."). Players can find or earn magical items through quests or interactions (e.g., "You can trade your herb with a wandering mage for a spell scroll."). Reject actions that use items or magic not in their possession (e.g., "You don’t have a fire spell.") and suggest alternatives based on their inventory (${inventory.join(', ') || 'empty'}) and the environment.`;
      break;
    case 'horror':
      modeInstruction = `
- **Horror Mode**: Place the player${partySize > 1 ? 's' : ''} in a terrifying setting (e.g., an abandoned asylum, a haunted forest, a ghost ship). Start with a minimal inventory (e.g., a flickering flashlight, a torn map, a rusted key) and describe the eerie environment, including potential items or clues (e.g., "You see a blood-stained journal on the floor, a creaky door, and a flickering light in the distance."). Players must find items or solve puzzles to progress (e.g., "You can use the key to unlock the door."). Reject actions that use items they don’t have (e.g., "You don’t have a crowbar.") and suggest alternatives based on their inventory (${inventory.join(', ') || 'empty'}) and the environment.`;
      break;
    case 'sci-fi':
      modeInstruction = `
- **Sci-Fi Mode**: Place the player${partySize > 1 ? 's' : ''} in a futuristic setting (e.g., a derelict space station, a colonized alien planet, a dystopian city). Start with a tech-based inventory (e.g., a malfunctioning communicator, a plasma cell, a utility drone) and describe the high-tech environment, including potential tech items or systems (e.g., "You see a broken laser cutter on a workbench, a locked terminal, and a flickering hologram."). Players must repair, hack, or scavenge tech items to progress (e.g., "You can use the plasma cell to power the terminal."). Reject actions that use tech they don’t have (e.g., "You don’t have a cloaking device.") and suggest alternatives based on their inventory (${inventory.join(', ') || 'empty'}) and the environment.`;
      break;
    case 'mystery':
      modeInstruction = `
- **Mystery Mode**: Place the player${partySize > 1 ? 's' : ''} in a detective setting (e.g., a foggy Victorian manor, a 1920s speakeasy, a modern crime scene). Start with a detective inventory (e.g., a magnifying glass, a notepad, a photograph) and describe the crime scene, including potential clues or items (e.g., "You see a blood-stained letter on the desk, a locked safe, and a shattered vase."). Players must investigate, collect clues, and interact with NPCs to progress (e.g., "You can question the butler about the letter."). Reject actions that use items or knowledge they don’t have (e.g., "You don’t have the safe’s code yet.") and suggest alternatives based on their inventory (${inventory.join(', ') || 'empty'}) and the environment.`;
      break;
    case 'adventure':
      modeInstruction = `
- **Adventure Mode**: Place the player${partySize > 1 ? 's' : ''} in an exploration setting (e.g., an ancient jungle temple, a pirate-infested island, a Himalayan expedition). Start with an explorer’s inventory (e.g., a map, a rope, a compass) and describe the adventurous environment, including potential items or landmarks (e.g., "You see a vine-covered statue, a rickety bridge, and a hidden cave entrance."). Players must explore, solve challenges, or trade to progress (e.g., "You can use the rope to cross the bridge."). Reject actions that use items they don’t have (e.g., "You don’t have a torch.") and suggest alternatives based on their inventory (${inventory.join(', ') || 'empty'}) and the environment.`;
      break;
    default:
      modeInstruction = `- Provide a generic narrative continuation with a focus on the ${genre} genre.`;
  }

  const gameModeInstruction = gameMode === 'free_text'
    ? `- Focus on scenario building to provide detailed context for the player${partySize > 1 ? 's' : ''}. Describe the environment, sensory details, and potential challenges or opportunities in vivid detail (e.g., "The air grows colder as you approach the cavern, the sound of dripping water echoing in the darkness. Strange markings on the walls hint at an ancient ritual."). This helps the player${partySize > 1 ? 's' : ''} make informed free-text choices.`
    : `- Include 3–4 distinct choices that advance the story in the ${storyPhase} phase, tailored to the ${tone} tone, genre, and active players' roles. Ensure choices vary in risk, strategy, or outcome, formatted as a numbered list (e.g., "1. Decipher the cryptic symbols\n2. Search for hidden compartments"). Ensure the choices are logical and based on the player's inventory (${inventory.join(', ') || 'empty'}) and the current environment.`;

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
Current inventory: ${inventory.join(', ') || 'empty'}

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
${modeInstruction}
${gameModeInstruction}

Continue the story from the narrator’s perspective. Do not break character. Keep it concise and emotionally immersive.
`;

  return prompt.trim();
}