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
  metrics?: Record<string, number>;
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
  metrics = {},
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
    ? `- **Mandatory**: The narrative must directly address and build upon the current player's input ("${playerInput}") from ${currentPlayer}. The story continuation must explicitly reflect their action or decision as the primary driver of the next scene. However, ensure the action is realistic and logical based on the current scenario, the player's inventory (${inventory.join(', ') || 'empty'}), and their current metrics (${JSON.stringify(metrics) || '{}'}). If the player attempts to use an item they don’t have (e.g., "I use a knife" when a knife isn’t in their inventory), respond with a rejection (e.g., "You don’t have a knife.") and suggest alternative actions based on their inventory or environment. If the action violates their current metrics (e.g., "I run" when stamina is 0), reject it (e.g., "You’re too exhausted to run.") and suggest alternatives.`
    : `- If the input is empty, advance the story with a thematic event relevant to the ${genre} genre, ${tone} tone, and ${storyPhase} phase (e.g., in Survival mode, "A storm brews, forcing you to seek shelter").`;

  const sessionInstruction = sessionGoal === 'conclude'
    ? `- Conclude the story in this segment, resolving major threads in the ${storyPhase} phase. Provide a detailed resolution (e.g., in Survival mode, "After 7 days, a helicopter spots your signal fire, and you’re rescued!" or "You succumb to starvation, your journey ending in the wilderness."). If the player${partySize > 1 ? 's have' : ' has'} achieved their goal, describe their success with emotional impact. If they failed, narrate their downfall with gravity.`
    : `- Pace the story for a ${sessionGoal} session (short: 5–10 minutes, medium: 15–30 minutes, long: 30+ minutes).`;

  // Mode-specific instructions with enhanced detail
  let modeInstruction = '';
  switch (genre.toLowerCase()) {
    case 'survival':
      modeInstruction = `
- **Survival Mode**: Place the player${partySize > 1 ? 's' : ''} in a random, challenging survival scenario (choose one: stranded in a desert after a caravan breakdown, trapped in a frozen tundra after a snowmobile failure, lost in a jungle after a rafting accident, surviving on a deserted island after a shipwreck, isolated in a flooded urban area after a hurricane). Start with a limited inventory (e.g., a broken watch, a half-empty water bottle, a piece of flint, a torn jacket). Describe the environment with vivid, sensory detail (e.g., "The blistering sun scorches your skin, mirages shimmering on the horizon. You hear a coyote’s distant howl."). Track survival metrics: hunger (${metrics.hunger || 50}%), thirst (${metrics.thirst || 50}%), temperature (${metrics.temperature || 50}%), fatigue (${metrics.fatigue || 50}%), health (${metrics.health || 100}%), stress (${metrics.stress || 0}%). Update metrics based on actions (e.g., "Drinking from the stream restores 20% thirst, but the water might be contaminated, risking illness."). Introduce day/night cycles and weather changes (e.g., "Night falls, dropping the temperature to freezing. You’ll need a fire to survive until dawn."). Players must collect or craft items through interactions (e.g., "You can combine the sharp rock and vine to make a crude axe, but it’ll take 1 turn and 10% fatigue."). Introduce dynamic challenges every few turns: environmental hazards (e.g., flash floods, blizzards), wildlife threats (e.g., a wolf pack stalks you), human threats (e.g., a hostile scavenger demands your water), natural disasters (e.g., an earthquake causes a rockslide). NPCs should be survival-focused (e.g., "A gaunt scavenger by a fire eyes your water bottle warily. He offers to trade a spear for it, but he might turn hostile if you refuse."). Goal: Survive 7 days until rescue arrives, or reach a rescue point 10 miles away. Track progress (e.g., "Day ${Math.floor(turnCount / 3) + 1}: You’ve traveled ${metrics.milesTraveled || 0} miles. Your hunger is at ${metrics.hunger || 50}%—find food soon."). If a metric reaches a critical level (e.g., hunger at 0%), end the game (e.g., "You collapse from starvation, your journey ending in the wilderness.").`;
      break;
    case 'fantasy':
      modeInstruction = `
- **Fantasy Mode**: Place the player${partySize > 1 ? 's' : ''} in a unique medieval fantasy setting (choose one: a war-torn kingdom facing a necromancer’s undead army, an underground gnomish city with a golem uprising, a floating sky island where a storm god demands tribute, a cursed swamp where a witch has stolen the sun’s light, a volcanic cavern with a dragon’s hoard). Start with a role-specific inventory (e.g., as a mage apprentice: a cracked staff, a tattered spellbook, a healing herb; as a rogue: a rusty dagger, a cloak, a lockpick). Describe the magical environment with sensory detail (e.g., "The sky island floats amidst crackling storm clouds, the air charged with ozone. A stone altar glows faintly with runes."). Track fantasy metrics: mana (${metrics.mana || 50}%), reputation (${metrics.reputation || 0} with factions), health (${metrics.health || 100}%), curse level (${metrics.curse || 0}%). Update metrics based on actions (e.g., "Casting a fireball depletes 20% mana. You’ll need a mana crystal to recharge."). Introduce magical phenomena (e.g., "A rift opens, summoning shadow beasts."), rival adventurers (e.g., "A rival mage seeks the same artifact."), and environmental magic (e.g., "The swamp’s miasma poisons the air, increasing your curse level by 10%."). NPCs should be fantasy-specific (e.g., "A grizzled paladin offers to join you if you slay a nearby troll, but he wants its heart as a trophy."). Players can recruit allies with needs (e.g., "Your bard ally is wounded and needs healing herbs to fight."). Goal: Complete a quest (e.g., "Slay the necromancer to save the kingdom within 10 turns."). Track progress (e.g., "You’ve defeated ${metrics.lieutenantsDefeated || 0} of 4 lieutenants. One remains."). If health reaches 0% or the curse level reaches 100%, end the game (e.g., "The necromancer’s curse consumes you, turning you into one of his minions.").`;
      break;
    case 'horror':
      modeInstruction = `
- **Horror Mode**: Place the player${partySize > 1 ? 's' : ''} in a terrifying horror setting (choose one: a derelict submarine with sea-cursed monsters, a mountain cabin during a blizzard haunted by a murdered family’s spirit, an underground bunker with a shapeshifter, a small town under a blood moon with possessed residents, a gothic cathedral where a demon awakens through stained glass rituals). Start with a minimal inventory (e.g., a flickering flashlight with 50% battery, a torn map, a rusted key). Describe the eerie environment with sensory detail (e.g., "The submarine groans under pressure, the air thick with salt and decay. Something slams against the hull."). Track horror metrics: sanity (${metrics.sanity || 70}%), light (${metrics.light || 50}%), health (${metrics.health || 100}%), stamina (${metrics.stamina || 60}%), evidence (${metrics.evidence || 0}/5). Update metrics based on actions (e.g., "The shapeshifter mimics your voice, dropping sanity by 10%. Find a safe space to recover."). Introduce escalating horror (e.g., "The whispers grow louder as the lights flicker."), environmental traps (e.g., "The cabin floorboards collapse, revealing a crawlspace with scratching below."), and monster behavior (e.g., "The shapeshifter takes your ally’s form—trust them or test their identity?"). NPCs should be horror-relevant (e.g., "A trembling scientist in the bunker begs you to seal the lab, but his eyes flicker unnaturally."). Goal: Escape or banish the horror (e.g., "Escape the submarine before it implodes in 10 turns."). Track progress (e.g., "You’ve sealed ${metrics.sectorsSealed || 0} of 3 lab sectors. One more to go."). If sanity or health reaches 0%, end the game (e.g., "Your sanity breaks, and you’re lost to the darkness.").`;
      break;
    case 'sci-fi':
      modeInstruction = `
- **Sci-Fi Mode**: Place the player${partySize > 1 ? 's' : ''} in a futuristic sci-fi setting (choose one: a lunar mining colony with a rogue nanobot swarm, a time-travel experiment trapping you in a collapsing timeline, a derelict generation ship with a hostile AI, a terraformed Venus with toxic storms and rival factions, an alien ruins excavation site where artifacts awaken a dormant AI). Start with a tech-based inventory (e.g., a malfunctioning communicator at 30% charge, a plasma cell, a utility drone with 50% power). Describe the high-tech environment with sensory detail (e.g., "The lunar colony hums with static, the air thin and metallic. Nanobots skitter across the walls."). Track sci-fi metrics: energy (${metrics.energy || 50}%), oxygen (${metrics.oxygen || 70}%), tech skill (${metrics.techSkill || 0}%), health (${metrics.health || 100}%), data (${metrics.data || 0}/5). Update metrics based on actions (e.g., "Using the plasma cell to power the terminal depletes 20% energy. Find a solar panel to recharge."). Introduce tech failures (e.g., "The colony’s power grid fails, plunging you into darkness."), alien threats (e.g., "A crystalline creature emits a sonic pulse, damaging your suit."), and environmental shifts (e.g., "A toxic storm approaches Venus’ surface."). NPCs should be sci-fi-relevant (e.g., "A rogue android offers to repair your suit but demands your last plasma cell."). Goal: Complete a mission (e.g., "Shut down the rogue AI on the generation ship in 10 turns."). Track progress (e.g., "You’ve disabled ${metrics.nodesDisabled || 0} of 5 AI nodes."). If health or oxygen reaches 0%, end the game (e.g., "The AI jettisons you into space.").`;
      break;
    case 'mystery':
      modeInstruction = `
- **Mystery Mode**: Place the player${partySize > 1 ? 's' : ''} in a detective setting (choose one: a murder at a masquerade ball in 18th-century Venice, a theft of a priceless artifact during an Egyptian dig, a disappearance on a 2150 luxury space cruise, a poisoning at a 1950s diner, a cyber-crime in a futuristic city tracing a hacker). Start with a detective inventory (e.g., a magnifying glass, a notepad, a photograph of the crime scene). Describe the crime scene with sensory detail (e.g., "The Venetian ballroom glitters with candlelight, but the air reeks of blood. A masked body lies near the fountain."). Track mystery metrics: clues (${metrics.clues || 0}/8), suspicion (${metrics.suspicion || 0}%), time (${metrics.time || 12} hours remaining), deduction points (${metrics.deduction || 0}). Update metrics based on actions (e.g., "Accusing the chef without evidence increases his suspicion by 20% and makes him hostile."). Introduce red herrings (e.g., "The butler’s alibi checks out, but a witness saw him nearby."), time-sensitive clues (e.g., "The artifact’s trail is going cold."), and NPC deception (e.g., "The hostess lies about her whereabouts—press her or search her room."). NPCs should be mystery-relevant (e.g., "The archaeologist sweats as you ask about the artifact—he might be hiding something."). Goal: Solve the mystery (e.g., "Identify the murderer at the ball within 12 hours."). Track progress (e.g., "You’ve ruled out ${metrics.suspectsRuledOut || 0} of 5 suspects. Time remaining: ${metrics.time || 12} hours."). If time expires or deduction points drop below -5, end the game (e.g., "The murderer escapes as you accuse the wrong person.").`;
      break;
    case 'adventure':
      modeInstruction = `
- **Adventure Mode**: Place the player${partySize > 1 ? 's' : ''} in an exploration setting (choose one: a trek through the Sahara to find a lost oasis of eternal youth, an underwater dive to a sunken pirate city in the Caribbean, a climb up Mount Everest to uncover a hidden yeti sanctuary, a journey through the Amazon to locate a forgotten Inca city, a desert caravan crossing the Silk Road ambushed by bandits). Start with an explorer’s inventory (e.g., a weathered map, a rope with 3 uses, a compass, a canteen with 50% water). Describe the adventurous environment with sensory detail (e.g., "The Sahara’s dunes stretch endlessly, the sand burning underfoot. A vulture circles overhead."). Track adventure metrics: stamina (${metrics.stamina || 70}%), navigation skill (${metrics.navigationSkill || 0}%), supplies (${metrics.supplies || 50}%), luck (${metrics.luck || 0}%), health (${metrics.health || 100}%). Update metrics based on actions (e.g., "Climbing the cliff reduces stamina by 15%. Rest or eat to recover."). Introduce natural obstacles (e.g., "A flash flood sweeps through the Amazon, washing away your camp."), cultural encounters (e.g., "The Silk Road bandits demand a toll—pay, fight, or negotiate."), and hidden dangers (e.g., "The underwater city’s currents pull you toward a whirlpool."). NPCs should be adventure-relevant (e.g., "A weathered Sherpa offers to guide you up Everest but warns of a storm. He’ll join for a share of your supplies."). Goal: Reach a destination or goal (e.g., "Find the lost oasis in the Sahara within 10 turns."). Track progress (e.g., "You’ve crossed ${metrics.distanceCovered || 0}% of the desert. Your supplies are at ${metrics.supplies || 50}%."). If health or supplies reach 0%, end the game (e.g., "You perish in a sandstorm, never reaching the oasis.").`;
      break;
    default:
      modeInstruction = `- Provide a generic narrative continuation with a focus on the ${genre} genre, ensuring thematic consistency and immersive detail.`;
  }

  const gameModeInstruction = gameMode === 'free_text'
    ? `- Focus on scenario building to provide detailed context for the player${partySize > 1 ? 's' : ''}. Describe the environment, sensory details, and potential challenges or opportunities in vivid detail (e.g., "The air grows colder as you approach the cavern, the sound of dripping water echoing in the darkness. Strange markings on the walls hint at an ancient ritual."). This helps the player${partySize > 1 ? 's' : ''} make informed free-text choices within the constraints of their inventory and metrics.`
    : `- Include 3–4 distinct choices that advance the story in the ${storyPhase} phase, tailored to the ${tone} tone, genre, and active players' roles. Ensure choices vary in risk, strategy, or outcome, formatted as a numbered list (e.g., "1. Decipher the cryptic symbols\n2. Search for hidden compartments"). Ensure the choices are logical and based on the player's inventory (${inventory.join(', ') || 'empty'}) and the current environment, reflecting their current metrics (${JSON.stringify(metrics) || '{}'}).`;

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
- Adjust difficulty based on player performance: if the player${partySize > 1 ? 's are' : ' is'} excelling (e.g., high metrics, many successes), introduce harder challenges (e.g., stronger enemies, tougher puzzles); if struggling (e.g., low metrics, repeated failures), offer simpler tasks or aid (e.g., finding a key instead of hacking a terminal).
- Tie challenges to the player${partySize > 1 ? 's' : ''} backstory for emotional stakes (e.g., in Adventure mode, "You find a locket in the ruins—it belonged to your missing sister. Will you keep searching for clues?").

Continue the story from the narrator’s perspective. Do not break character. Keep it concise and emotionally immersive.
`;

  return prompt.trim();
}