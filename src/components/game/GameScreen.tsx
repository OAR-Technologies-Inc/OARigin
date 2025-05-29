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
    console.log('GameScreen state:', { currentRoom, gameState, players, currentPlayerIndex });
    if (!currentRoom) {
      console.log('Navigating to / because currentRoom is null');
      navigate('/');
    }
  }, [currentRoom, navigate]);

  useEffect(() => {
    const initializeStory = async () => {
      if (!hasStartedRef.current && currentRoom && storySegments.length === 0 && !loadingStory) {
        if (!currentRoom.genreTag || typeof currentRoom.genreTag !== 'string') {
          console.error("Genre is missing or invalid:", currentRoom);
          return;
        }

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

    // [unchanged code continues...]
  
  }
  
  export default GameScreen;