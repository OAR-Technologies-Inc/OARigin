import React, { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import Terminal from '../ui/Terminal';
import Button from '../ui/Button';
import TextArea from '../ui/TextArea';
import { StorySegment, GameMode, GameState } from '../../types';
import { useGameStore } from '../../store';

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
  const { currentRoom, players, currentUser, currentPlayerIndex } = useGameStore();
  const [freestyleInput, setFreestyleInput] = useState('');

  // Check if current user is dead
  const currentUserPlayer = currentUser ? players.find(p => p.id === currentUser.id) : null;
  const isCurrentUserDead = currentUserPlayer?.status === 'dead';
  
  // Check if it's the current user's turn
  const currentTurnPlayer = players[currentPlayerIndex];
  const isCurrentUserTurn = currentUser && currentTurnPlayer && currentUser.id === currentTurnPlayer.id;

  // Debug rendering
  useEffect(() => {
    console.log('----StoryConsole Render Check----');
    console.log('currentRoom:', currentRoom);
    console.log('gameMode:', currentRoom?.gameMode);
    console.log('isProcessing:', isProcessing);
    console.log('animationComplete:', animationComplete);
    console.log('currentPlayer:', currentPlayer);
    console.log('gameState:', gameState);
    console.log('isCurrentUserDead:', isCurrentUserDead);
    console.log('isCurrentPlayerDead:', isCurrentPlayerDead);
    console.log('isCurrentUserTurn:', isCurrentUserTurn);
    console.log('currentUser:', currentUser);
    console.log('currentTurnPlayer:', currentTurnPlayer);
  }, [currentRoom, isProcessing, animationComplete, currentPlayer, gameState, isCurrentUserDead, isCurrentPlayerDead, isCurrentUserTurn, currentUser, currentTurnPlayer]);

  useEffect(() => {
    if (isCurrentUserDead || isCurrentPlayerDead || gameState === GameState.ENDED) {
      setFreestyleInput('');
    }
  }, [isCurrentUserDead, isCurrentPlayerDead, gameState]);

  const getDisplayedLines = (): string[] => {
    const lines: string[] = [];
    const filtered = tempSegment ? storySegments.filter(s => s.id !== tempSegment.id) : storySegments;
    const sortedSegments = [...filtered].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    sortedSegments.forEach(segment => {
      if (segment.content) lines.push(`> ${segment.content}`, '');
      if (segment.aiResponse) lines.push(segment.aiResponse, '');
    });
    return lines;
  };

  const getActiveLine = (): string => tempSegment?.aiResponse || '';

  const handleFreestyleSubmit = () => {
    if (freestyleInput.trim() && !isProcessing && !isCurrentUserDead && !isCurrentPlayerDead && gameState !== GameState.ENDED && isCurrentUserTurn) {
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
    if (!isProcessing && !isCurrentUserDead && !isCurrentPlayerDead && gameState !== GameState.ENDED && isCurrentUserTurn) {
      console.log('----Option Selection----');
      console.log('option:', option);
      console.log('gameMode:', currentRoom?.gameMode);
      onMakeChoice(option);
    }
  };

  const getInputPlaceholder = () => {
    if (isCurrentUserDead) return "You have died and can no longer act";
    if (gameState === GameState.ENDED) return "Game Over - Story has concluded";
    if (!isCurrentUserTurn) return `Waiting for ${currentPlayer}'s turn...`;
    return "Enter your action or response...";
  };

  const getStatusMessage = () => {
    if (isCurrentUserDead) return <span className="text-red-500">You have died</span>;
    if (gameState === GameState.ENDED) return <span className="text-amber-500">Story Complete</span>;
    if (!isCurrentUserTurn) return <span className="text-yellow-500">Waiting for {currentPlayer}'s turn</span>;
    return "What do you do?";
  };

  const isInputDisabled = isCurrentUserDead || isCurrentPlayerDead || gameState === GameState.ENDED || isProcessing || !isCurrentUserTurn;

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
            onChange={(e) => !isInputDisabled && setFreestyleInput(e.target.value)}
            disabled={isInputDisabled}
            fullWidth
            className={`min-h-[80px] text-sm md:text-base ${isInputDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          <Button
            variant={isInputDisabled ? "danger" : "primary"}
            onClick={handleFreestyleSubmit}
            disabled={!freestyleInput.trim() || isInputDisabled}
            icon={<Send size={16} />}
            fullWidth
            className={`mt-2 ${isInputDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isInputDisabled ? "Cannot Submit" : "Submit Move"}
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
                variant={isInputDisabled ? "danger" : "secondary"}
                onClick={() => handleOptionSelect(option)}
                disabled={isInputDisabled}
                fullWidth
                className={`text-sm md:text-base ${isInputDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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