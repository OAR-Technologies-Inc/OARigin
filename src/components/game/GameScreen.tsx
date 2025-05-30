import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Save, Users, ArrowLeft } from 'lucide-react';
import { useGameStore } from '../../store';
import StoryConsole from './StoryConsole';
import ChatSidebar from './ChatSidebar';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { StorySegment, GameState } from '../../types';
import { buildNarrationPrompt } from '../../utils/promptBuilder';
import { v4 as uuidv4 } from 'uuid';
import { generateStoryBeginning, generateStoryContinuation } from '../../utils/mockAi';

const GameScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentRoom,
    players,
    storySegments,
    addStorySegment,
    setGameState,
    gameState,
    currentUser,
    deadPlayers,
    isHost,
  } = useGameStore();

  const [tempSegment, setTempSegment] = useState<StorySegment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);

  const currentPlayer = players[currentPlayerIndex]?.username;

  useEffect(() => {
    if (currentRoom && currentRoom.genreTag) {
      console.log('Initializing story with genre:', currentRoom.genreTag);
      initializeStory(currentRoom.genreTag);
    }
  }, [currentRoom]);

  const initializeStory = async (genre) => {
    if (!currentRoom || !players.length) return;
    setIsProcessing(true);
    const intro = await generateStoryBeginning(genre, players, currentRoom);
    const initialSegment: StorySegment = {
      id: uuidv4(),
      roomId: currentRoom.id,
      content: '',
      aiResponse: intro,
      decisionType: currentRoom.gameMode === 'free_text' ? 'freestyle' : 'multiple_choice',
      createdAt: new Date().toISOString(),
    };
    setTempSegment(initialSegment);
    setIsProcessing(false);
    setGameState(GameState.PLAYING);
  };

  const onMakeChoice = async (choice: string) => {
    if (!currentRoom || !currentUser) return;
    setIsProcessing(true);
    const result = await generateStoryContinuation({
      genre: currentRoom.genreTag,
      players: players.map(p => p.username),
      storyLog: storySegments.map(s => s.aiResponse),
      currentPlayer: currentUser.username,
      playerInput: choice,
      deadPlayers,
      gameMode: currentRoom.gameMode
    });

    const newSegment: StorySegment = {
      id: uuidv4(),
      roomId: currentRoom.id,
      content: choice,
      aiResponse: result.text,
      decisionType: currentRoom.gameMode === 'free_text' ? 'freestyle' : 'multiple_choice',
      createdAt: new Date().toISOString(),
    };

    setTempSegment(newSegment);
    setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
    setIsProcessing(false);
  };

  if (!currentRoom || !currentRoom.genreTag || !players.length) {
    return <div className="p-4 text-white">Loading game...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white p-4">
      <div className="flex justify-between mb-2">
        <Button onClick={() => navigate('/')} icon={<ArrowLeft size={18} />}>Exit</Button>
        <div className="flex space-x-2">
          <MessageSquare />
          <Save />
          <Users />
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-grow gap-4">
        <div className="w-full md:w-3/4 h-full">
          <Card className="h-full">
            <StoryConsole
              storySegments={storySegments}
              tempSegment={tempSegment}
              setTempSegment={setTempSegment}
              addStorySegment={addStorySegment}
              onMakeChoice={onMakeChoice}
              isProcessing={isProcessing}
              currentPlayer={currentPlayer}
              gameState={gameState}
            />
          </Card>
        </div>

        <div className="w-full md:w-1/4">
          <ChatSidebar />
        </div>
      </div>
    </div>
  );
};

export default GameScreen;