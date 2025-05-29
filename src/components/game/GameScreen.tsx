import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Save, Users, ArrowLeft } from 'lucide-react';
import { useGameStore } from '../store';
import StoryConsole from './StoryConsole';
import ChatSidebar from './ChatSidebar';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { StorySegment, GameState } from '../../types';
import { buildNarrationPrompt } from '../../utils/promptBuilder';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../supabase';

// Function to call GPT API via Supabase Edge Function
const fetchAIResponse = async (prompt: string): Promise<string> => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-story', {
      body: JSON.stringify({ prompt }),
    });

    if (error) {
      throw new Error(`Failed to fetch AI response: ${error.message}`);
    }

    return data.response || 'The story begins to unfold... [An unexpected AI response occurred]';
  } catch (error) {
    console.error('Error fetching AI response:', error);
    return 'The story begins to unfold... [An unexpected error occurred]';
  }
};

const GameScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentRoom,
    players,
    newPlayers,
    currentPlayerIndex,
    storySegments,
    addStorySegment,
    gameState,
    loadingStory,
    setLoadingStory,
    nextPlayerTurn,
    clearNewPlayers,
    setPlayerDeath,
    checkGameEnd,
    updateProgress,
    setGameState,
    progress,
  } = useGameStore();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [tempSegment, setTempSegment] = useState<StorySegment | null>(null);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!currentRoom || gameState === GameState.ENDED) {
      navigate('/');
    }
  }, [currentRoom, gameState, navigate]);

  useEffect(() => {
    const initializeStory = async () => {
      if (!hasStartedRef.current && currentRoom && storySegments.length === 0 && !loadingStory) {
        hasStartedRef.current = true;
        setLoadingStory(true);

        try {
          const prompt = buildNarrationPrompt({
            genre: currentRoom.genreTag,
            players: players.map(p => p.username),
            storyLog: [],
            currentPlayer: '',
            playerInput: '',
            deadPlayers: [],
            newPlayers: players.map(p => p.username),
            gameMode: currentRoom.gameMode,
            tone: 'tense',
            playerRoles: {},
            storyPhase: 'opening',
            sessionGoal: 'medium',
            inventory: [],
            turnCount: 0,
            progress,
          });

          const initialStory = await fetchAIResponse(prompt);

          const newSegment: StorySegment = {
            id: uuidv4(),
            roomId: currentRoom.id,
            content: '',
            aiResponse: initialStory,
            decisionType: 'freestyle',
            options: [],
            createdAt: new Date().toISOString()
          };

          setTempSegment(newSegment);
        } catch (error) {
          console.error('Failed to generate story beginning:', error);
          const fallbackSegment: StorySegment = {
            id: uuidv4(),
            roomId: currentRoom.id,
            content: '',
            aiResponse: 'The story begins to unfold... [An unexpected error occurred]',
            decisionType: 'freestyle',
            options: [],
            createdAt: new Date().toISOString()
          };
          setTempSegment(fallbackSegment);
        } finally {
          setLoadingStory(false);
        }
      }
    };

    initializeStory();
  }, [currentRoom, storySegments, loadingStory, players]);

  useEffect(() => {
    const introduceNewPlayers = async () => {
      if (loadingStory || !currentRoom || tempSegment || newPlayers.length === 0) return;

      setLoadingStory(true);

      try {
        const deadPlayers = players.filter(p => p.status === 'dead').map(p => p.username);

        const prompt = buildNarrationPrompt({
          genre: currentRoom.genreTag,
          players: players.map(p => p.username),
          storyLog: storySegments.map(s => s.aiResponse || s.content).filter(s => s),
          currentPlayer: '',
          playerInput: '',
          deadPlayers,
          newPlayers: newPlayers.map(p => p.username),
          gameMode: currentRoom.gameMode,
          tone: 'tense',
          playerRoles: {},
          storyPhase: storySegments.length < 3 ? 'opening' : storySegments.length < 6 ? 'rising' : storySegments.length < 9 ? 'climax' : 'resolution',
          sessionGoal: 'medium',
          inventory: [],
          turnCount: storySegments.length,
          progress,
        });

        const text = await fetchAIResponse(prompt);

        const newSegment: StorySegment = {
          id: uuidv4(),
          roomId: currentRoom.id,
          content: '',
          aiResponse: text,
          decisionType: 'freestyle',
          options: [],
          createdAt: new Date().toISOString()
        };

        setTempSegment(newSegment);
        clearNewPlayers();
      } catch (error) {
        console.error('Failed to introduce new players:', error);
        const fallbackSegment: StorySegment = {
          id: uuidv4(),
          roomId: currentRoom.id,
          content: '',
          aiResponse: 'A new presence joins the story... [An unexpected error occurred]',
          decisionType: 'freestyle',
          options: [],
          createdAt: new Date().toISOString()
        };
        setTempSegment(fallbackSegment);
        clearNewPlayers();
      } finally {
        setLoadingStory(false);
      }
    };

    introduceNewPlayers();
  }, [newPlayers, loadingStory, currentRoom, tempSegment, storySegments, players]);

  const handleMakeChoice = async (choice: string) => {
    if (loadingStory || !currentRoom || tempSegment || gameState === GameState.ENDED) return;

    setLoadingStory(true);

    try {
      const deadPlayers = players.filter(p => p.status === 'dead').map(p => p.username);
      
      const prompt = buildNarrationPrompt({
        genre: currentRoom.genreTag,
        players: players.map(p => p.username),
        storyLog: storySegments.map(s => s.aiResponse || s.content).filter(s => s),
        currentPlayer: players[currentPlayerIndex].username,
        playerInput: choice,
        deadPlayers,
        newPlayers: [],
        gameMode: currentRoom.gameMode,
        tone: 'tense',
        playerRoles: {},
        storyPhase: storySegments.length < 3 ? 'opening' : storySegments.length < 6 ? 'rising' : storySegments.length < 9 ? 'climax' : 'resolution',
        sessionGoal: 'medium',
        inventory: [],
        turnCount: storySegments.length,
        progress,
      });

      const text = await fetchAIResponse(prompt);
      let cleanText = text;
      let playerDied = false;

      // Check for [PLAYER_DEATH] token
      if (cleanText.includes('[PLAYER_DEATH]')) {
        cleanText = cleanText.replace('[PLAYER_DEATH]', '');
        playerDied = true;
        setPlayerDeath(players[currentPlayerIndex].username);
      }

      // Check for [GAME_ENDED] token
      if (cleanText.includes('[GAME_ENDED]')) {
        cleanText = cleanText.replace('[GAME_ENDED]', '');
        setGameState(GameState.ENDED);
      }

      // Parse AI response for progress updates (e.g., clues found, distance traveled)
      const updatedProgress = parseProgressUpdates(cleanText, currentRoom.genreTag);
      updateProgress(updatedProgress);

      const newSegment: StorySegment = {
        id: uuidv4(),
        roomId: currentRoom.id,
        content: choice,
        aiResponse: cleanText,
        decisionType: 'freestyle',
        options: [],
        createdAt: new Date().toISOString()
      };

      setTempSegment(newSegment);
      nextPlayerTurn();
      checkGameEnd();
    } catch (error) {
      console.error('Failed to generate story continuation:', error);
      const fallbackSegment: StorySegment = {
        id: uuidv4(),
        roomId: currentRoom.id,
        content: choice,
        aiResponse: 'The story pauses momentarily... [An unexpected error occurred]',
        decisionType: 'freestyle',
        options: [],
        createdAt: new Date().toISOString()
      };
      setTempSegment(fallbackSegment);
      nextPlayerTurn();
      checkGameEnd();
    } finally {
      setLoadingStory(false);
    }
  };

  const handleExportTranscript = () => {
    let transcriptText = '# OARigin Adventure Transcript\n\n';

    storySegments.forEach((segment) => {
      transcriptText += segment.aiResponse + '\n\n';
      if (segment.content) {
        transcriptText += `> ${segment.content}\n\n`;
      }
    });

    const blob = new Blob([transcriptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oarigin-adventure-${currentRoom?.code || 'transcript'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentPlayer = players[currentPlayerIndex]?.username || 'Player';
  const isCurrentPlayerDead = players[currentPlayerIndex]?.status === 'dead';

  return (
    <div className="min-h-screen flex flex-col p-2 md:p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate('/')}
          >
            Exit
          </Button>

          <h1 className="font-mono text-base md:text-xl text-green-500 hidden md:block">
            {currentRoom?.genreTag} Adventure
          </h1>
        </div>

        <div className="flex gap-1 md:gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<Users size={16} />}
            className="px-2 md:px-3"
          >
            {players.filter(p => p.status === 'alive').length}/{players.length}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            icon={<Save size={16} />}
            onClick={handleExportTranscript}
            className="px-2 md:px-3"
          >
            <span className="hidden md:inline">Export</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            icon={<MessageSquare size={16} />}
            onClick={() => setIsChatOpen(true)}
            className="px-2 md:px-3"
          >
            <span className="hidden md:inline">Chat</span>
          </Button>
        </div>
      </div>

      <Card className="flex-grow p-2 md:p-4 overflow-hidden">
        <StoryConsole
          storySegments={storySegments}
          tempSegment={tempSegment}
          setTempSegment={setTempSegment}
          addStorySegment={addStorySegment}
          onMakeChoice={handleMakeChoice}
          isProcessing={loadingStory}
          currentPlayer={currentPlayer}
          isCurrentPlayerDead={isCurrentPlayerDead}
          gameState={gameState}
        />
      </Card>

      <ChatSidebar isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
};

// Utility to parse progress updates from AI response
const parseProgressUpdates = (aiResponse: string, genre: string): Partial<GameProgress> => {
  const updates: Partial<GameProgress> = {};

  // Simple parsing logic (adjust based on your AI response format)
  // For example, look for specific keywords indicating progress
  if (genre.toLowerCase() === 'survival') {
    if (aiResponse.toLowerCase().includes('you travel') || aiResponse.toLowerCase().includes('miles')) {
      updates.milesTraveled = (progress.milesTraveled || 0) + 1;
    }
    if (aiResponse.toLowerCase().includes('day passes') || aiResponse.toLowerCase().includes('another day')) {
      updates.daysSurvived = (progress.daysSurvived || 0) + 1;
    }
  } else if (genre.toLowerCase() === 'fantasy') {
    if (aiResponse.toLowerCase().includes('artifact') || aiResponse.toLowerCase().includes('relic')) {
      updates.artifactsFound = (progress.artifactsFound || 0) + 1;
    }
  } else if (genre.toLowerCase() === 'horror' || genre.toLowerCase() === 'mystery') {
    if (aiResponse.toLowerCase().includes('clue') || aiResponse.toLowerCase().includes('evidence')) {
      updates.cluesFound = (progress.cluesFound || 0) + 1;
    }
  } else if (genre.toLowerCase() === 'sci-fi') {
    if (aiResponse.toLowerCase().includes('node') || aiResponse.toLowerCase().includes('disabled')) {
      updates.nodesDisabled = (progress.nodesDisabled || 0) + 1;
    }
  } else if (genre.toLowerCase() === 'adventure') {
    if (aiResponse.toLowerCase().includes('you progress') || aiResponse.toLowerCase().includes('closer to')) {
      updates.distanceCovered = (progress.distanceCovered || 0) + 10;
    }
  }

  return updates;
};

export default GameScreen;