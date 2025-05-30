import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Save, Users, ArrowLeft } from 'lucide-react';
import { useGameStore } from '../../store';
import StoryConsole from './StoryConsole';
import ChatSidebar from './ChatSidebar';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { StorySegment, GameState, GameProgress, GameMode } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { generateStoryBeginning, generateStoryContinuation } from '../../utils/mockAi';

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
    markPlayerDead,
    updateProgress,
    setGameState,
    progress,
    currentUser,
  } = useGameStore();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [tempSegment, setTempSegment] = useState<StorySegment | null>(null);
  const [animationComplete, setAnimationComplete] = useState(false);
  const hasStartedRef = useRef(false);

  // Debug store state
  useEffect(() => {
    console.log('----GameScreen Store Check----');
    console.log('currentRoom:', currentRoom);
    console.log('gameMode:', currentRoom?.gameMode);
    console.log('genreTag:', currentRoom?.genreTag);
    console.log('players:', players);
    console.log('currentPlayerIndex:', currentPlayerIndex);
    console.log('currentUser:', currentUser);
  }, [currentRoom, players, currentPlayerIndex, currentUser]);

  useEffect(() => {
    if (!currentRoom) navigate('/');
  }, [currentRoom, navigate]);

  useEffect(() => {
    const initializeStory = async () => {
      if (!hasStartedRef.current && currentRoom && storySegments.length === 0 && !loadingStory) {
        hasStartedRef.current = true;
        setLoadingStory(true);

        try {
          const initialStory = await generateStoryBeginning(
            currentRoom.genreTag || 'adventure',
            players,
            currentRoom
          );

          const newSegment: StorySegment = {
            id: uuidv4(),
            roomId: currentRoom.id,
            content: '',
            aiResponse: initialStory,
            decisionType: 'freestyle',
            options: [],
            createdAt: new Date().toISOString(),
          };

          setTempSegment(newSegment);
          setAnimationComplete(false);
        } catch (error) {
          console.error('Initialize story error:', error);
          const fallback: StorySegment = {
            id: uuidv4(),
            roomId: currentRoom.id,
            content: '',
            aiResponse: 'The story begins... [error]',
            decisionType: 'freestyle',
            options: [],
            createdAt: new Date().toISOString(),
          };
          setTempSegment(fallback);
        } finally {
          setLoadingStory(false);
        }
      }
    };

    initializeStory();
  }, [currentRoom, storySegments, loadingStory, players, setLoadingStory]);

  const handleMakeChoice = async (choice: string) => {
    const isCurrentPlayerDead = players[currentPlayerIndex]?.status === 'dead';
    const isUserDead = currentUser?.id && players.find(p => p.id === currentUser.id)?.status === 'dead';
    if (loadingStory || !currentRoom || tempSegment || gameState === GameState.ENDED || isCurrentPlayerDead || isUserDead) {
      console.log('----Input Blocked----');
      console.log('isCurrentPlayerDead:', isCurrentPlayerDead);
      console.log('isUserDead:', isUserDead);
      return;
    }

    setLoadingStory(true);

    try {
      const deadPlayers = players.filter(p => p.status === 'dead').map(p => p.username);
      const result = await generateStoryContinuation({
        genre: currentRoom.genreTag || 'adventure',
        players: players.map(p => p.username),
        storyLog: storySegments.map(s => s.aiResponse || s.content).filter(Boolean),
        currentPlayer: players[currentPlayerIndex].username,
        playerInput: choice,
        deadPlayers,
        newPlayers: [],
        gameMode: currentRoom.gameMode || GameMode.FREE_TEXT,
      });

      const text = result?.text || '';
      const playerDied = result?.playerDied || false;

      console.log('----Story Continuation Response----');
      console.log('text:', text);
      console.log('playerDied:', playerDied);

      if (playerDied) {
        markPlayerDead(players[currentPlayerIndex].id);
      }
      if (text.includes('[GAME_ENDED]')) {
        setGameState(GameState.ENDED);
      }

      const updatedProgress = parseProgressUpdates(text, currentRoom.genreTag || 'adventure', progress);
      updateProgress(updatedProgress);

      const newSegment: StorySegment = {
        id: uuidv4(),
        roomId: currentRoom.id,
        content: choice,
        aiResponse: text.replace('[GAME_ENDED]', ''),
        decisionType: 'freestyle',
        options: [],
        createdAt: new Date().toISOString(),
      };

      setTempSegment(newSegment);
      setAnimationComplete(false);

      nextPlayerTurn();
    } catch (error) {
      console.error('Handle choice error:', error);
      const fallback: StorySegment = {
        id: uuidv4(),
        roomId: currentRoom.id,
        content: choice,
        aiResponse: 'The story pauses... [error]',
        decisionType: 'freestyle',
        options: [],
        createdAt: new Date().toISOString(),
      };
      setTempSegment(fallback);
      nextPlayerTurn();
    } finally {
      setLoadingStory(false);
    }
  };

  const handleExportTranscript = () => {
    const transcript = storySegments.map(s => `${s.aiResponse}\n${s.content || ''}\n`).join('\n');
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oarigin-transcript-${currentRoom?.code || 'session'}.txt`;
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
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate('/')}>Exit</Button>
          <h1 className="font-mono text-base md:text-xl text-green-500 hidden md:block">
            {currentRoom?.genreTag || 'Adventure'} Adventure
          </h1>
        </div>
        <div className="flex gap-1 md:gap-2">
          <Button variant="ghost" size="sm" icon={<Users size={16} />} className="px-2 md:px-3">
            {players.filter(p => p.status === 'alive').length}/{players.length}
          </Button>
          <Button variant="ghost" size="sm" icon={<Save size={16} />} onClick={handleExportTranscript} className="px-2 md:px-3">
            <span className="hidden md:inline">Export</span>
          </Button>
          <Button variant="ghost" size="sm" icon={<MessageSquare size={16} />} onClick={() => setIsChatOpen(true)} className="px-2 md:px-3">
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
          animationComplete={animationComplete}
          setAnimationComplete={setAnimationComplete}
        />
      </Card>

      <ChatSidebar isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
};

const parseProgressUpdates = (aiResponse: string = '', genre: string = 'adventure', progress: any): Partial<GameProgress> => {
  const updates: Partial<GameProgress> = {};
  if (!aiResponse) return updates;
  const text = aiResponse.toLowerCase();
  if (genre.toLowerCase() === 'survival') {
    if (text.includes('you travel') || text.includes('miles')) updates.milesTraveled = (progress.milesTraveled || 0) + 1;
    if (text.includes('day passes') || text.includes('another day')) updates.daysSurvived = (progress.daysSurvived || 0) + 1;
  } else if (genre.toLowerCase() === 'fantasy') {
    if (text.includes('artifact') || text.includes('relic')) updates.artifactsFound = (progress.artifactsFound || 0) + 1;
  } else if (['horror', 'mystery'].includes(genre.toLowerCase())) {
    if (text.includes('clue') || text.includes('evidence')) updates.cluesFound = (progress.cluesFound || 0) + 1;
  } else if (genre.toLowerCase() === 'sci-fi') {
    if (text.includes('node') || text.includes('disabled')) updates.nodesDisabled = (progress.nodesDisabled || 0) + 1;
  } else if (genre.toLowerCase() === 'adventure') {
    if (text.includes('you progress') || text.includes('closer to')) updates.distanceCovered = (progress.distanceCovered || 0) + 10;
  }
  return updates;
};

export default GameScreen;