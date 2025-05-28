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
}) => {
  const { currentRoom } = useGameStore();
  const [freestyleInput, setFreestyleInput] = useState('');
  const [animationDone, setAnimationDone] = useState(false);
  const [options, setOptions] = useState<string[]>([]);

  // Clear input when player dies or game ends
  useEffect(() => {
    if (isCurrentPlayerDead || gameState === GameState.ENDED) {
      setFreestyleInput('');
    }
  }, [isCurrentPlayerDead, gameState]);

  useEffect(() => {
    if (tempSegment) {
      setAnimationDone(false);
      if (currentRoom?.gameMode === GameMode.MULTIPLE_CHOICE && tempSegment.aiResponse) {
        const extractedOptions = extractOptions(tempSegment.aiResponse);
        setOptions(extractedOptions);
      }
    } else {
      setOptions([]);
    }
  }, [tempSegment, currentRoom?.gameMode]);

  const getDisplayedLines = (): string[] => {
    const lines: string[] = [];

    const filtered = tempSegment
      ? storySegments.filter((s) => s.id !== tempSegment.id)
      : storySegments;

    const sortedSegments = [...filtered].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    sortedSegments.forEach((segment) => {
      if (segment.content) {
        lines.push(`> ${segment.content}`, '');
      }
      if (segment.aiResponse) {
        lines.push(segment.aiResponse, '');
      }
    });

    return lines;
  };

  const getActiveLine = (): string => {
    return tempSegment?.aiResponse || '';
  };

  const handleFreestyleSubmit = () => {
    if (freestyleInput.trim() && !isProcessing && !isCurrentPlayerDead && gameState !== GameState.ENDED) {
      const profaneWords = [
        'fuck', 'shit', 'damn', 'asshole', 'bitch', 'cunt', 'bastard'
      ];
      const isProfane = profaneWords.some(word =>
        freestyleInput.toLowerCase().includes(word)
      );
      if (isProfane) {
        alert('Please avoid using inappropriate language.');
        return;
      }

      onMakeChoice(freestyleInput);
      setFreestyleInput('');
    }
  };

  const handleOptionSelect = (option: string) => {
    if (!isProcessing && !isCurrentPlayerDead && gameState !== GameState.ENDED) {
      onMakeChoice(option);
    }
  };

  const getInputPlaceholder = () => {
    if (isCurrentPlayerDead) {
      return "You have died and can no longer act";
    }
    if (gameState === GameState.ENDED) {
      return "Game Over - Story has concluded";
    }
    return "Enter your action or response...";
  };

  const getStatusMessage = () => {
    if (isCurrentPlayerDead) {
      return <span className="text-red-500">You have died</span>;
    }
    if (gameState === GameState.ENDED) {
      return <span className="text-amber-500">Story Complete</span>;
    }
    return "What do you do?";
  };

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
              setAnimationDone(true);
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

      {!isProcessing && animationDone && currentPlayer && (
        <div className="sticky bottom-0 bg-gray-900 p-4 rounded-lg shadow-lg">
          <div className="mb-2 text-sm font-mono text-green-400">
            <strong>{currentPlayer}'s turn:</strong> {getStatusMessage()}
          </div>
          
          <div className="space-y-2">
            {currentRoom?.gameMode === GameMode.FREE_TEXT ? (
              <>
                <TextArea
                  placeholder={getInputPlaceholder()}
                  value={freestyleInput}
                  onChange={(e) => !isCurrentPlayerDead && gameState !== GameState.ENDED && setFreestyleInput(e.target.value)}
                  disabled={isCurrentPlayerDead || gameState === GameState.ENDED}
                  fullWidth
                  className={`min-h-[80px] text-sm md:text-base ${
                    isCurrentPlayerDead ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
                <Button
                  variant={isCurrentPlayerDead ? "danger" : "primary"}
                  onClick={handleFreestyleSubmit}
                  disabled={!freestyleInput.trim() || isCurrentPlayerDead || gameState === GameState.ENDED}
                  icon={<Send size={16} />}
                  fullWidth
                  className={`mt-2 ${isCurrentPlayerDead ? 'opacity-50' : ''}`}
                >
                  {isCurrentPlayerDead ? "You Have Died" : "Submit Move"}
                </Button>
              </>
            ) : (
              <div className="space-y-2">
                {options.length > 0 ? (
                  options.map((option, index) => (
                    <Button
                      key={index}
                      variant={isCurrentPlayerDead ? "danger" : "secondary"}
                      onClick={() => handleOptionSelect(option)}
                      disabled={isCurrentPlayerDead || gameState === GameState.ENDED}
                      fullWidth
                      className={`text-sm md:text-base ${
                        isCurrentPlayerDead ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {option}
                    </Button>
                  ))
                ) : (
                  <div className="text-gray-500 text-sm text-center">
                    {isCurrentPlayerDead ? (
                      'You have died'
                    ) : gameState === GameState.ENDED ? (
                      'Story has concluded'
                    ) : (
                      'Waiting for options...'
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Utility to extract options from AI response
const extractOptions = (aiResponse: string): string[] => {
  const lines = aiResponse.split('\n');
  const options: string[] = [];
  
  for (const line of lines) {
    const match = line.match(/^\d+\.\s*(.+)$/);
    if (match) {
      options.push(match[1].trim());
    }
  }
  
  return options.length > 0 ? options : [];
};

export default StoryConsole;