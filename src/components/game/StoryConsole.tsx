import React, { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import Terminal from '../ui/Terminal';
import Button from '../ui/Button';
import TextArea from '../ui/TextArea';
import { StorySegment, GameMode, GameState } from '../../types';
import { useGameStore } from '../../store';
import { supabase } from '../../lib/supabase';

interface StoryConsoleProps {
  storySegments: StorySegment[];
  tempSegment: StorySegment | null;
  setTempSegment: (seg: StorySegment | null) => void;
  addStorySegment: (seg: StorySegment) => void;
  onMakeChoice: (choice: string) => void;
  isProcessing: boolean;
  currentPlayer: string;
  isCurrentPlayerDead: boolean;
  gameState: GameState;
  animationComplete: boolean;
  setAnimationComplete: (complete: boolean) => void;
}

const StoryConsole: React.FC<StoryConsoleProps> = ({
  storySegments,
  tempSegment,
  setTempSegment,
  addStorySegment,
  onMakeChoice,
  isProcessing,
  currentPlayer,
  isCurrentPlayerDead,
  gameState,
  animationComplete,
  setAnimationComplete,
}) => {
  const { currentRoom, players, currentUser, gameStateTable } = useGameStore();
  const [freestyleInput, setFreestyleInput] = useState('');
  const [isPlayerDead, setIsPlayerDead] = useState(false);
  const [isPlayersTurn, setIsPlayersTurn] = useState(false);

  // Sync player death with Supabase
  useEffect(() => {
    const checkPlayerStatus = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        setIsPlayerDead(false);
        return;
      }
      const userId = session.user.id;
      const player = players.find(p => p.id === userId);
      setIsPlayerDead(player?.status === 'dead');
    };
    checkPlayerStatus();
  }, [players]);

  // Determine if it's the current user's turn
  useEffect(() => {
    const checkTurn = async () => {
      let userId = currentUser?.id;
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      }
      if (userId && gameStateTable) {
        setIsPlayersTurn(userId === gameStateTable.current_player_id);
      } else {
        setIsPlayersTurn(false);
      }
    };
    checkTurn();
  }, [currentUser, gameStateTable]);

  useEffect(() => {
    if (isPlayerDead || isCurrentPlayerDead || gameState === GameState.ENDED) {
      setFreestyleInput('');
    }
  }, [isPlayerDead, isCurrentPlayerDead, gameState]);

  // Debug rendering
  useEffect(() => {
    console.log('----StoryConsole Render Check----');
    console.log('currentRoom:', currentRoom);
    console.log('gameMode:', currentRoom?.gameMode);
    console.log('isProcessing:', isProcessing);
    console.log('animationComplete:', animationComplete);
    console.log('currentPlayer:', currentPlayer);
    console.log('gameState:', gameState);
    console.log('isPlayerDead:', isPlayerDead);
    console.log('isCurrentPlayerDead:', isCurrentPlayerDead);
  }, [currentRoom, isProcessing, animationComplete, currentPlayer, gameState, isPlayerDead, isCurrentPlayerDead]);

  const getDisplayedLines = (): string[] => {
    const lines: string[] = [];
    const sortedSegments = [...storySegments].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    sortedSegments.forEach((segment) => {
      if (segment.content) lines.push(`> ${segment.content}`, '');
      if (segment.aiResponse) lines.push(segment.aiResponse, '');
    });
    if (storySegments.length === 0 && tempSegment) {
      if (tempSegment.content) lines.push(`> ${tempSegment.content}`, '');
      if (tempSegment.aiResponse) lines.push(tempSegment.aiResponse, '');
    }
    return lines;
  };

  const getActiveLine = (): string =>
    storySegments.length === 0 ? tempSegment?.aiResponse || '' : '';

  const handleFreestyleSubmit = () => {
    if (freestyleInput.trim() && !isProcessing && !isPlayerDead && !isCurrentPlayerDead && gameState !== GameState.ENDED) {
      const profaneWords = ['fuck', 'shit', 'damn', 'asshole', 'bitch', 'cunt', 'bastard'];
      if (profaneWords.some(word => freestyleInput.toLowerCase().includes(word))) {
        alert('Please avoid using inappropriate language.');
        return;
      }
      console.log('----Input Submission----');
      console.log('freestyleInput:', freestyleInput);
      console.log('gameMode:', currentRoom?.gameMode);
      onMakeChoice(freestyleInput);
      setFreestyleInput('');
    }
  };

  const handleOptionSelect = (option: string) => {
    if (
      !isProcessing &&
      !isPlayerDead &&
      !isCurrentPlayerDead &&
      gameState !== GameState.ENDED &&
      isPlayersTurn
    ) {
      console.log('----Option Selection----');
      console.log('option:', option);
      console.log('gameMode:', currentRoom?.gameMode);
      onMakeChoice(option);
    }
  };

  const getInputPlaceholder = () => {
    if (isPlayerDead || isCurrentPlayerDead)
      return 'You have died and can no longer act';
    if (gameState === GameState.ENDED)
      return 'Game Over - Story has concluded';
    if (!isPlayersTurn) return "Waiting for your turn...";
    return 'Enter your action or response...';
  };

  const getStatusMessage = () => {
    if (isPlayerDead || isCurrentPlayerDead)
      return <span className="text-red-500">You have died</span>;
    if (gameState === GameState.ENDED)
      return <span className="text-amber-500">Story Complete</span>;
    if (!isPlayersTurn)
      return <span className="text-sky-500">Waiting...</span>;
    return 'What do you do?';
  };

  const gameMode = currentRoom?.gameMode || GameMode.FREE_TEXT;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-hidden relative mb-4">
        <Terminal
          lines={getDisplayedLines()}
          animatedLine={getActiveLine()}
          typing={!!tempSegment}
          onTypingComplete={() => {
            if (tempSegment) {
              addStorySegment(tempSegment);
              setTempSegment(null);
              setAnimationComplete(true);
            }
          }}
          className="h-full min-h-[200px] md:min-h-[300px] max-h-[60vh] md:max-h-[70vh] text-sm md:text-base"
        />
        {isProcessing && (
          <div className="absolute bottom-4 left-4 font-mono text-xs text-green-500 animate-pulse">
            Generating story...
          </div>
        )}
      </div>

      {gameMode === GameMode.FREE_TEXT && (
        <div className="sticky bottom-0 bg-gray-900 p-4 rounded-lg shadow-lg">
          <div className="mb-2 text-sm font-mono text-green-400">
            <strong>{currentPlayer || 'Player'}'s turn:</strong> {getStatusMessage()}
          </div>
          <TextArea
            placeholder={getInputPlaceholder()}
            value={freestyleInput}
            onChange={(e) =>
              !isPlayerDead && gameState !== GameState.ENDED && setFreestyleInput(e.target.value)
            }
            disabled={
              isPlayerDead ||
              isCurrentPlayerDead ||
              gameState === GameState.ENDED ||
              isProcessing ||
              !isPlayersTurn
            }
            fullWidth
            className={`min-h-[80px] text-sm md:text-base ${(isPlayerDead || isCurrentPlayerDead || gameState === GameState.ENDED || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          <Button
            variant={
              isPlayerDead ||
              isCurrentPlayerDead ||
              gameState === GameState.ENDED ||
              isProcessing ||
              !isPlayersTurn
                ? 'danger'
                : 'primary'
            }
            onClick={handleFreestyleSubmit}
            disabled={
              !freestyleInput.trim() ||
              isPlayerDead ||
              isCurrentPlayerDead ||
              gameState === GameState.ENDED ||
              isProcessing ||
              !isPlayersTurn
            }
            icon={<Send size={16} />}
            fullWidth
            className={`mt-2 ${
              isPlayerDead ||
              isCurrentPlayerDead ||
              gameState === GameState.ENDED ||
              isProcessing ||
              !isPlayersTurn
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
          >
            {isPlayerDead ||
            isCurrentPlayerDead ||
            gameState === GameState.ENDED ||
            isProcessing ||
            !isPlayersTurn
              ? 'Cannot Submit'
              : 'Submit Move'}
          </Button>
        </div>
      )}

      {gameMode === GameMode.MULTIPLE_CHOICE && tempSegment?.aiResponse && extractOptions(tempSegment.aiResponse).length > 0 && (
        <div className="sticky bottom-0 bg-gray-900 p-4 rounded-lg shadow-lg">
          <div className="mb-2 text-sm font-mono text-green-400">
            <strong>{currentPlayer || 'Player'}'s turn:</strong> {getStatusMessage()}
          </div>
          <div className="space-y-2">
            {extractOptions(tempSegment.aiResponse).map((option, index) => (
              <Button
                key={index}
                variant={
                  isPlayerDead ||
                  isCurrentPlayerDead ||
                  gameState === GameState.ENDED ||
                  isProcessing ||
                  !isPlayersTurn
                    ? 'danger'
                    : 'secondary'
                }
                onClick={() => handleOptionSelect(option)}
                disabled={
                  isPlayerDead ||
                  isCurrentPlayerDead ||
                  gameState === GameState.ENDED ||
                  isProcessing ||
                  !isPlayersTurn
                }
                fullWidth
                className={`text-sm md:text-base ${
                  isPlayerDead ||
                  isCurrentPlayerDead ||
                  gameState === GameState.ENDED ||
                  isProcessing ||
                  !isPlayersTurn
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                {option}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const extractOptions = (aiResponse: string): string[] => {
  const lines = aiResponse.split('\n');
  const options: string[] = [];
  for (const line of lines) {
    const match = line.match(/^\d+\.\s*(.+)$/);
    if (match) options.push(match[1].trim());
  }
  return options.length > 0 ? options : [];
};

export default StoryConsole;