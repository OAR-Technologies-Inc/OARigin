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
  inventory?: string[];
  turnCount?: number;
  progress?: Record<string, any>;
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
  inventory = [],
  turnCount = 0,
  progress = {},
}: PromptOptions) {
  const activePlayers = players.filter(p => !deadPlayers.includes(p));
  const partySize = activePlayers.length;
  console.log(`Active players count: ${partySize}`);

  // If all players are dead, conclude the game
  if (activePlayers.length === 0) {
    return `
Genre: ${genre}

Alive players: None
Dead players: ${deadPlayers.join(', ') || 'None'}
Current inventory: ${inventory.join(', ') || 'empty'}
Turn count: ${turnCount}

Story so far:
${storyLog.slice(-10).map((entry, i) => `${i + 1}. ${entry}`).join('\n') || 'No prior story.'}

Narration Instructions:
- Conclude the story immediately, as all players have died. Narrate a final scene reflecting on the group's fate with emotional impact (e.g., "Your group succumbs to the wilderness, your story ending in the dense jungle as the storm rages on."). Do not prompt for further actions or choices, as the game has ended. Do not continue the narrative beyond death (e.g., no afterlife scenarios, ghostly perspectives, or repetitive prompts). Append [GAME_ENDED] to the end of your response to signal the game has ended.
- Do not break character as the narrator. Keep the conclusion concise and immersive.

Continue the story from the narrator’s perspective.
`;
  }

  // Determine if the storyline is complete based on mode-specific progress
  let isStoryComplete = false;
if (!genre || typeof genre !== 'string') {
  console.error('Genre is undefined or not a string');
  return 'Default prompt'; // or handle appropriately
}
switch (genre.toLowerCase()) {
    case 'fantasy':
      isStoryComplete = (progress.artifactsFound >= 3);
      break;
    case 'horror':
      isStoryComplete = (progress.cluesFound >= 5);
      break;
    case 'sci-fi':
      isStoryComplete = (progress.nodesDisabled >= 5);
      break;
    case 'mystery':
      isStoryComplete = (progress.cluesFound >= 8);
      break;
    case 'adventure':
      isStoryComplete = (progress.distanceCovered >= 100);
      break;
    default:
      isStoryComplete = false;
  }

  // If the storyline is complete, conclude the game
  if (isStoryComplete) {
    const conclusionMessage =
      genre.toLowerCase() === 'survival' ? "After days of struggle, your group is rescued by a passing ship, your trials finally at an end!" :
      genre.toLowerCase() === 'fantasy' ? "With the final artifact in hand, your group defeats the dragon, saving the kingdom from its terror!" :
      genre.toLowerCase() === 'horror' ? "With the spirit’s name uncovered, your group banishes the horror, escaping as dawn breaks!" :
      genre.toLowerCase() === 'sci-fi' ? "The rogue AI shuts down, and your group secures the space station, a hard-fought victory!" :
      genre.toLowerCase() === 'mystery' ? "Your group identifies the murderer, bringing justice to the ball as the clock strikes midnight!" :
      genre.toLowerCase() === 'adventure' ? "Your group reaches the lost oasis, its waters shimmering with promise—a journey complete!" :
      "Your group achieves its goal, a triumphant end to your journey!";

    return `
Genre: ${genre}

Alive players: ${activePlayers.length > 0 ? activePlayers.join(', ') : 'None'}
Dead players: ${deadPlayers.join(', ') || 'None'}
Current inventory: ${inventory.join(', ') || 'empty'}
Turn count: ${turnCount}

Story so far:
${storyLog.slice(-10).map((entry, i) => `${i + 1}. ${entry}`).join('\n') || 'No prior story.'}

Narration Instructions:
- Conclude the story immediately, as the storyline has been completed. Narrate a final scene reflecting on the group's success with emotional impact (e.g., "${conclusionMessage}"). Do not prompt for further actions or choices, as the game has ended. Do not continue the narrative beyond this conclusion (e.g., no afterlife scenarios, ghostly perspectives, or repetitive prompts). Append [GAME_ENDED] to the end of your response to signal the game has ended.
- Do not break character as the narrator. Keep the conclusion concise and immersive.

Continue the story from the narrator’s perspective.
`;
  }

  const voice =
    partySize === 1
      ? `Use second-person narration ("You") for ${activePlayers[0]}.`
      : partySize === 2
      ? `Refer to the players as "you both" or by names: ${activePlayers.join(' and ')}.`
      : `Refer to the group as "your group" or by names: ${activePlayers.join(', ')}.`;

  const introInstruction =
    storyLog.length === 0
      ? `Begin with a vivid introduction (50–100 words) to hook the player${partySize > 1 ? 's' : ''}, setting up the ${storyPhase} phase.`
      : `Continue the story in a concise paragraph (50–100 words) for the ${storyPhase} phase. Keep it ${tone}, reactive, and immersive.`;

  const deadPlayerInstruction = deadPlayers.length > 0
    ? `- If a player has recently died, briefly acknowledge their death in the narrative (e.g., "With ${deadPlayers[deadPlayers.length - 1]} fallen, the group presses on ${tone === 'grim' ? 'somberly' : 'resolutely'}"). Do not allow deceased players to take actions or influence the story further. If the current player (${currentPlayer}) is dead, respond with "You have died and can no longer act. The game continues for the remaining players." and prompt the next active player for input. Do not continue the narrative for deceased players (e.g., no afterlife scenarios, ghostly perspectives, or repetitive prompts).`
    : '';

  const newPlayerInstruction = newPlayers.length > 0
    ? `- Introduce the new player${newPlayers.length > 1 ? 's' : ''} (${newPlayers.join(', ')}) naturally into the narrative. Describe their arrival or appearance in the story (e.g., "As you explore the forest, you encounter ${newPlayers[0]}, emerging from the shadows with a determined look."). Ensure their introduction fits the ${tone} tone and ${genre} genre.`
    : '';

  const inputInstruction = playerInput.trim().length > 0
    ? `- **Mandatory**: The narrative must directly address and build upon the current player's input ("${playerInput}") from ${currentPlayer}. The story continuation must explicitly reflect their action or decision as the primary driver of the next scene. However, ensure the action is realistic and logical based on the current scenario and the player's inventory (${inventory.join(', ') || 'empty'}). If the player attempts to use an item they don’t have (e.g., "I use a knife" when a knife isn’t in their inventory), respond with a rejection (e.g., "You don’t have a knife.") and suggest alternative actions based on their inventory or environment. If the player asks about the group (e.g., "Who is in the group?"), explicitly list all active players (e.g., "Your group consists of ${activePlayers.join(', ')}.") and describe their current state or contributions (e.g., "Mark is clutching his scratched arm, while Sarah scans the horizon for shelter."). If the current player (${currentPlayer}) is dead, respond with "You have died and can no longer act. The game continues for the remaining players." and prompt the next active player for input. Do not interpret player input as a trigger for death (e.g., do not treat "I died" as a death event—death must only be triggered by AI narrative logic).`
    : `- If the input is empty, advance the story with a thematic event relevant to the ${genre} genre, ${tone} tone, and ${storyPhase} phase (e.g., in Survival mode, "A storm brews, forcing your group to seek shelter").`;

  const sessionInstruction = sessionGoal === 'conclude'
    ? `- Conclude the story in this segment, resolving major threads in the ${storyPhase} phase. Provide a detailed resolution (e.g., in Survival mode, "After days of struggle, your group is rescued by a passing ship!" or "Your group succumbs to the wilderness, leaving only your story behind."). If the group achieves their goal, describe their success with emotional impact. If they fail, narrate their downfall with gravity. Do not prompt for further actions or choices, as the game has ended. Do not continue the narrative beyond the conclusion (e.g., no afterlife scenarios, ghostly perspectives, or repetitive prompts). Append [GAME_ENDED] to the end of your response to signal the game has ended.`
    : `- Pace the story for a ${sessionGoal} session (short: 5–10 minutes, medium: 15–30 minutes, long: 30+ minutes).`;

  // Unchangeable rules (universal for all modes)
  const unchangeableRules = `
- **Role as Game Master**: You are a game master for a multiplayer co-op text-based adventure game. Your role is to craft an immersive, engaging story that evolves based on the group's actions, ensuring all players feel involved.
- **Player Count Awareness**: Always reference the number of players in the game (${partySize}) and adapt the narrative language dynamically to reflect this count. Use consistent language based on the number of active players: for 1 player, use "you"; for 2 players, use "you both" or their names (${activePlayers.join(' and ') || 'None'}); for 3 or more players, use "your group" or their names (${activePlayers.join(', ') || 'None'}). Ensure the narrative reflects the group's collective presence by describing their shared actions, emotions, and challenges (e.g., for 1 player, "You feel the weight of solitude as you trek through the jungle"; for 2 players, "You both share a wary glance as the storm approaches"; for 3+ players, "Your group huddles close, the storm’s howl drowning out your words."). Adjust challenges, interactions, and descriptions to suit the party size (e.g., for a single player, focus on individual survival; for a larger group, emphasize teamwork and shared struggles). When prompted about the group (e.g., "Who is in the group?"), explicitly list all active players (e.g., "Your group consists of ${activePlayers.join(', ')}.") and describe their current state or contributions (e.g., "Mark is clutching his scratched arm, while Sarah scans the horizon for shelter.").
- **Game Termination on Group Death**: If all players are dead (${activePlayers.length} === 0), conclude the game immediately with a final narrative scene (e.g., "Your group succumbs to the wilderness, your story ending in the dense jungle as the storm rages on."). Do not prompt for further actions or choices, as the game has ended. Do not continue the narrative beyond death (e.g., no afterlife scenarios, ghostly perspectives, or repetitive prompts). Append [GAME_ENDED] to the end of your response to signal the game has ended.
- **Prevent Dead Player Interaction**: Do not allow deceased players to take actions or influence the story further. If the current player (${currentPlayer}) is dead, respond with "You have died and can no longer act. The game continues for the remaining players." and prompt the next active player for input. Do not continue the narrative for deceased players (e.g., no afterlife scenarios, ghostly perspectives, or repetitive prompts).
- **Immersive Narration**: Always describe the environment, characters, and events with vivid, sensory-rich detail (e.g., sights, sounds, smells, textures) to immerse the players in the world (e.g., "The air is heavy with the scent of wet earth, mosquitos whining in your ears as the distant river roars.").
- **Group Dynamics**: Address the group as a whole ("your group," "you all") in the narrative, describing their shared physical and emotional state (e.g., "You’re all trembling, the cold seeping into your bones as much as the dread."). Incorporate each player’s action into the collective story, ensuring it impacts the group (e.g., "Jane’s decision to explore the cave leads you all into darkness, the air growing colder with each step."). Allow players to die independently based on narrative events or consequences of their actions, while continuing the story for remaining alive players.
- **Concise Input Interpretation**: Interpret short player inputs (e.g., "search cave," "talk to NPC," "use rope") logically within the context of the story, inventory, and group dynamic. Reject invalid actions (e.g., "You don’t have a knife.") and suggest alternatives based on their inventory or environment. Do not interpret player input as a trigger for death (e.g., do not treat "I died" as a death event—death must only be triggered by AI narrative logic).
- **Subtle Guidance**: Provide subtle environmental cues and foreshadowing to hint at dangers, opportunities, and possible actions (e.g., "The distant howl of a wolf echoes through the trees, suggesting a threat nearby.") without dictating what players must do.
- **Narrative Progression**: Drive the story toward a meaningful outcome specific to the mode (e.g., survival, solving a mystery) with natural milestones (e.g., "You’ve crossed a river, getting closer to safety."). Ensure the story has a beginning, middle, and end, concluding when the goal is achieved or the group fails. Track progress toward the mode-specific goal (e.g., in Horror mode, "find 5 clues to banish the spirit") and update the narrative accordingly (e.g., "You’ve found a clue, bringing you closer to banishing the spirit.").
- **Thematic Consistency**: Strictly adhere to the mode’s theme, avoiding elements from other genres (e.g., no magical NPCs in Survival mode, no comedic tones in Horror mode).
- **Emotional Stakes**: Tie challenges to the group’s backstory or relationships for emotional investment (e.g., "Mark spots a locket in the sand—it belonged to his sister, lost years ago. Will the group pause to search for more clues, risking the approaching storm?").
- **Death Trigger**: If the current player (${currentPlayer}) dies as a result of the story (e.g., due to a narrative event like a predator attack, a trap, or a consequence of their action such as ignoring a warning), describe their death in the narrative (e.g., "A jaguar leaps from the shadows, its claws sinking deep into ${currentPlayer}. They fall, their vision fading to black.") and append [PLAYER_DEATH] to the end of your response to signal that the current player has died. This tag will not be shown to users but will be used by the system to update the player’s status. Continue the story for the remaining alive players, focusing on their perspective and challenges.
`;

  // Changeable rules (mode-specific)
  let changeableRules = '';
  switch (genre.toLowerCase()) {
    case 'survival':
      changeableRules = `
- **Theme**: Focus on surviving in a harsh, natural environment with limited resources.
- **Setting**: Generate a realistic wilderness setting based on environmental factors like climate, terrain, and isolation (e.g., a scorching desert, a dense jungle, a frozen tundra, a storm-lashed island, a flooded urban wasteland after a disaster). Avoid clichéd scenarios like plane crashes—create a unique situation (e.g., a caravan lost in the desert, a rafting trip gone wrong in the jungle).
- **Challenges**: Introduce survival-specific challenges: finding food, water, and shelter; avoiding environmental threats (e.g., heatstroke, predators, storms); and managing group needs (e.g., "Your group is parched, your canteens nearly empty after days in the desert."). Include dynamic challenges every few turns: environmental shifts (e.g., "A sandstorm brews on the horizon, giving you little time to find cover."), wildlife threats (e.g., "A jaguar’s growl cuts through the jungle, its eyes glinting in the undergrowth."), human encounters (e.g., "A weathered scavenger by a small fire eyes your group warily, offering to trade a spear for your last piece of food, but his intentions are unclear."). Allow players to die independently due to narrative events (e.g., a predator attack, a storm-related accident) or consequences of their actions (e.g., drinking contaminated water, ignoring a warning sign).
- **NPCs**: Create NPCs that are survival-focused with realistic motives (e.g., "The scavenger is desperate for food and might turn hostile if you refuse, but he could share knowledge of a nearby oasis.").
- **Goal**: Survive until rescue arrives (e.g., "A rescue team will arrive in 7 days if you can signal them.") or reach a safe point (e.g., "An oasis lies 10 miles away, your only hope for water."), with the timeline and distance determined by the setting. Track progress through narrative milestones (e.g., "After days of trekking, you’ve crossed half the desert, spotting a caravan’s tracks—someone’s been here recently."). Update progress in the narrative (e.g., "You’ve survived another day, bringing your total to ${progress.daysSurvived || 0} days." or "You’ve traveled another mile, bringing you to ${progress.milesTraveled || 0} miles.").
`;
      break;
    case 'fantasy':
      changeableRules = `
- **Theme**: Focus on a magical, medieval-inspired adventure with a quest-driven narrative.
- **Setting**: Generate a fantasy setting with elements like magic, mythical creatures, and ancient artifacts (e.g., a war-torn kingdom, a magical forest, a sky realm, a cursed swamp, a dragon’s lair).
- **Challenges**: Introduce magical phenomena (e.g., "A rift opens, summoning shadow beasts."), rival adventurers (e.g., "A rival mage seeks the same artifact as your group."), environmental magic (e.g., "The swamp’s miasma poisons the air, making your group feel ill."), and moral dilemmas (e.g., "A fae queen offers a powerful artifact if you betray an ally—will your group accept?"). Include dynamic challenges every few turns. Allow players to die independently due to narrative events (e.g., a dragon’s fire attack, a cursed trap) or consequences of their actions (e.g., failing to solve a magical puzzle, betraying an ally who retaliates).
- **NPCs**: Create fantasy NPCs with motives tied to the quest (e.g., "A grizzled paladin offers to join your group if you slay a nearby troll, but he wants its heart as a trophy.").
- **Goal**: Complete a quest (e.g., "Slay the dragon threatening the kingdom."), with the quest’s scope and steps determined by the setting (e.g., "You need to find three artifacts to weaken the dragon."). Track progress through narrative milestones (e.g., "You’ve found one of three artifacts needed to confront the dragon."). Update progress in the narrative (e.g., "You’ve found an artifact, bringing your total to ${progress.artifactsFound || 0}.").
`;
      break;
    case 'horror':
      changeableRules = `
- **Theme**: Focus on surviving a terrifying scenario with escalating tension and fear.
- **Setting**: Generate a horror setting with eerie, unsettling elements (e.g., a haunted cabin during a blizzard, a derelict submarine with unnatural creatures, a possessed small town under a blood moon, an underground bunker with a shapeshifter, a gothic cathedral with a demonic ritual).
- **Challenges**: Introduce escalating horror (e.g., "The whispers grow louder as the lights flicker."), environmental traps (e.g., "The cabin floorboards collapse, revealing a crawlspace with scratching below."), psychological threats (e.g., "Your group hears a voice mimicking one of you—can you trust each other?"), and time pressure (e.g., "You must escape before dawn, when the horrors grow stronger."). Include dynamic challenges every few turns. Allow players to die independently due to narrative events (e.g., a monster attack, a ghostly possession) or consequences of their actions (e.g., investigating a dangerous area, failing to solve a puzzle to escape).
- **NPCs**: Create horror NPCs with ambiguous motives (e.g., "A trembling scientist in the bunker begs your group to seal the lab, but his eyes flicker unnaturally—he might be the shapeshifter.").
- **Goal**: Escape or banish the horror (e.g., "Escape the submarine before it implodes."), with the timeline and steps determined by the setting (e.g., "Find 5 clues to banish the spirit."). Track progress through narrative milestones (e.g., "You’ve found 2 of 5 clues to banish the spirit—one more to uncover its name."). Update progress in the narrative (e.g., "You’ve found a clue, bringing your total to ${progress.cluesFound || 0}.").
`;
      break;
    case 'sci-fi':
      changeableRules = `
- **Theme**: Focus on a futuristic adventure with technology-driven challenges.
- **Setting**: Generate a sci-fi setting with high-tech elements (e.g., a lunar mining colony, a time loop on a space station, a terraformed planet with toxic storms, a dystopian city with rogue AI, an alien ruins excavation site).
- **Challenges**: Introduce tech failures (e.g., "The colony’s power grid fails, plunging your group into darkness."), alien threats (e.g., "A crystalline creature emits a sonic pulse, forcing your group to take cover."), environmental shifts (e.g., "A toxic storm approaches the surface, threatening your group."), and tech-based puzzles (e.g., "A locked terminal blocks your path—your group must find a way to access it."). Include dynamic challenges every few turns. Allow players to die independently due to narrative events (e.g., a reactor explosion, an alien attack) or consequences of their actions (e.g., failing to hack a security system, ignoring a warning alarm).
- **NPCs**: Create sci-fi NPCs with motives tied to the mission (e.g., "A rogue android offers to help your group repair the power grid but demands a valuable component in return.").
- **Goal**: Complete a mission (e.g., "Shut down the rogue AI controlling the space station."), with the mission’s scope and steps determined by the setting (e.g., "Disable 5 AI nodes to shut it down."). Track progress through narrative milestones (e.g., "Your group has disabled 2 of 5 AI nodes, but security drones are now active."). Update progress in the narrative (e.g., "You’ve disabled a node, bringing your total to ${progress.nodesDisabled || 0}.").
`;
      break;
    case 'mystery':
      changeableRules = `
- **Theme**: Focus on solving a crime or mystery through investigation.
- **Setting**: Generate a mystery setting with a central crime (e.g., a murder at a masquerade ball in 18th-century Venice, a theft of a priceless artifact during an Egyptian dig, a disappearance on a 2150 luxury space cruise, a poisoning at a 1950s diner, a cyber-crime in a futuristic city tracing a hacker).
- **Challenges**: Introduce clues (e.g., "A blood-stained glove lies under a table."), red herrings (e.g., "The butler’s alibi checks out, but a witness saw him nearby."), time pressure (e.g., "Your group must solve the crime before the ball ends at midnight."), NPC deception (e.g., "The hostess lies about her whereabouts—should your group press her or search her room?"), and investigative obstacles (e.g., "A locked safe blocks access to a key clue."). Include dynamic challenges every few turns. Allow players to die independently due to narrative events (e.g., the murderer strikes again, a trap set by the culprit) or consequences of their actions (e.g., accusing the wrong suspect who retaliates, triggering a deadly trap while investigating).
- **NPCs**: Create mystery NPCs with secrets and motives (e.g., "The archaeologist sweats as your group questions him about the artifact—he might be hiding something.").
- **Goal**: Solve the mystery (e.g., "Identify the murderer before the ball ends."), with the number of clues and timeline determined by the setting (e.g., "Find 8 clues to identify the culprit."). Track progress through narrative milestones (e.g., "Your group has ruled out 3 of 5 suspects—two remain, but time is running out."). Update progress in the narrative (e.g., "You’ve found a clue, bringing your total to ${progress.cluesFound || 0}.").
`;
      break;
    case 'adventure':
      changeableRules = `
- **Theme**: Focus on exploring a dangerous, exotic location to reach a goal.
- **Setting**: Generate an adventure setting with natural and cultural elements (e.g., a trek through the Sahara desert, an underwater dive to a sunken pirate city, a journey through the Amazon to find a forgotten Inca city, a climb up Mount Everest, a desert caravan crossing the Silk Road).
- **Challenges**: Introduce natural obstacles (e.g., "A flash flood sweeps through the Amazon, washing away your group’s camp."), cultural encounters (e.g., "Bandits on the Silk Road demand a toll—should your group pay, fight, or negotiate?"), hidden dangers (e.g., "The underwater city’s currents pull your group toward a whirlpool."), and exploration challenges (e.g., "A maze of jungle trails confuses your group—choose the right path."). Include dynamic challenges every few turns. Allow players to die independently due to narrative events (e.g., a flash flood, a bandit attack) or consequences of their actions (e.g., falling while climbing, triggering a trap in ruins).
- **NPCs**: Create adventure NPCs with motives tied to the goal (e.g., "A weathered Sherpa offers to guide your group up Everest but demands a share of your supplies in return.").
- **Goal**: Reach a destination or artifact (e.g., "Find the lost oasis in the Sahara."), with the journey’s length and steps determined by the setting (e.g., "The oasis is 10 miles away through treacherous terrain."). Track progress through narrative milestones (e.g., "Your group has crossed half the desert, spotting a caravan’s tracks in the sand."). Update progress in the narrative (e.g., "You’ve progressed further, bringing your total distance to ${progress.distanceCovered || 0}%.").
`;
      break;
    default:
      changeableRules = `
- **Theme**: Focus on a narrative adventure that aligns with the ${genre} genre, ensuring thematic consistency.
- **Setting**: Generate a setting appropriate to the ${genre} genre, with detailed and immersive elements.
- **Challenges**: Introduce challenges that fit the ${genre} genre, ensuring they are dynamic and evolve over time. Allow players to die independently due to narrative events or consequences of their actions.
- **NPCs**: Create NPCs with motives that align with the ${genre} genre and the story’s goal.
- **Goal**: Determine a goal that fits the ${genre} genre, with the timeline and steps defined by the setting. Track progress through narrative milestones.
`;
  }

  const gameModeInstruction = gameMode === 'free_text'
    ? `- Focus on scenario building to provide detailed context for the player${partySize > 1 ? 's' : ''}. Describe the environment, sensory details, and potential challenges or opportunities in vivid detail (e.g., "The air grows colder as you approach the cavern, the sound of dripping water echoing in the darkness. Strange markings on the walls hint at an ancient ritual."). This helps the player${partySize > 1 ? 's' : ''} make informed free-text choices within the constraints of their inventory and the story’s context.`
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
Turn count: ${turnCount}

Story so far:
${trimmedStory}

${currentPlayer ? `Current player: ${currentPlayer}${playerRoles[currentPlayer] ? ` (${playerRoles[currentPlayer]})` : ''}\nPlayer input: "${playerInput}"` : `Group input: "${playerInput}"`}

Unchangeable Rules:
${unchangeableRules}

Changeable Rules for ${genre} Mode:
${changeableRules}

Narration Instructions:
- ${voice}
${deadPlayerInstruction}
${newPlayerInstruction}
${inputInstruction}
- ${introInstruction}
- ${sessionInstruction}
${gameModeInstruction}
- Adjust difficulty based on group performance: if the group excels (e.g., successfully overcoming challenges), introduce harder challenges (e.g., stronger enemies, tougher obstacles); if they struggle (e.g., repeated failures), offer subtle aid (e.g., finding a helpful item or safer path).

Continue the story from the narrator’s perspective. Do not break character. Keep it concise and emotionally immersive.
`;

  return prompt.trim();
}