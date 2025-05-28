import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Save, Users, ArrowLeft } from 'lucide-react';
import { useGameStore } from '../../store';
import StoryConsole from './StoryConsole';
import ChatSidebar from './ChatSidebar';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { StorySegment, GameState } from '../../types';
import {
  generateStoryBeginning,
  generateStoryContinuation,
  simulateAiProcessing
} from '../../utils/mockAi';
import { v4 as uuidv4 } from 'uuid';

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
    checkGameEnd,
    progress
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
          const initialStory = await generateStoryBeginning(
            currentRoom.genreTag,
            players.map(p => p.username),
            currentRoom.gameMode
          );

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
        const previousSegment = storySegments[storySegments.length - 1]?.aiResponse || '';
        const deadPlayers = players.filter(p => p.status === 'dead').map(p => p.username);
        
        const aiResponse = await generateStoryContinuation({
          genre: currentRoom.genreTag,
          players: players.map(p => p.username),
          storyLog: storySegments.map(s => s.aiResponse || s.content).filter(s => s),
          currentPlayer: '',
          playerInput: '',
          deadPlayers,
          newPlayers: newPlayers.map(p => p.username),
          gameMode: currentRoom.gameMode
        });

        const newSegment: StorySegment = {
          id: uuidv4(),
          roomId: currentRoom.id,
          content: '',
          aiResponse,
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
      const previousSegment = storySegments[storySegments.length - 1]?.aiResponse || '';
      const deadPlayers = players.filter(p => p.status === 'dead').map(p => p.username);
      
      const aiResponse = await generateStoryContinuation({
        genre: currentRoom.genreTag,
        players: players.map(p => p.username),
        storyLog: storySegments.map(s => s.aiResponse || s.content).filter(s => s),
        currentPlayer: players[currentPlayerIndex].username,
        playerInput: choice,
        deadPlayers,
        newPlayers: [],
        gameMode: currentRoom.gameMode
      });

      const newSegment: StorySegment = {
        id: uuidv4(),
        roomId: currentRoom.id,
        content: choice,
        aiResponse,
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

export default GameScreen;