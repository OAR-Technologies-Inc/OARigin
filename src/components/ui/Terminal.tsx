import React, { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';

interface TerminalProps {
  lines: string[];
  animatedLine: string;
  className?: string;
  typing?: boolean;
  typingSpeed?: number; // ms per character
  blinkCursor?: boolean;
  onTypingComplete?: () => void;
}

const Terminal: React.FC<TerminalProps> = ({
  lines,
  animatedLine = '', // Provide default empty string
  className,
  typing = true,
  typingSpeed = 30,
  blinkCursor = true,
  onTypingComplete
}) => {
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [skip, setSkip] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Early return if animatedLine is falsy
    if (!animatedLine) {
      setTypedText('');
      setIsTyping(false);
      onTypingComplete?.();
      return;
    }

    let isCancelled = false;
    let current = '';
    let index = 0;

    setTypedText('');
    setSkip(false);
    setIsTyping(true);

    // Ensure animatedLine is a string
    const chars = String(animatedLine).split('');

    const interval = setInterval(() => {
      if (isCancelled || index >= chars.length || skip) {
        clearInterval(interval);
        setTypedText(String(animatedLine));
        setIsTyping(false);
        onTypingComplete?.();
        return;
      }

      current += chars[index];
      setTypedText(current);
      index++;
    }, typingSpeed);

    return () => {
      clearInterval(interval);
      isCancelled = true;
    };
  }, [animatedLine]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines, typedText]);

  const handleSkip = () => {
    if (!isTyping) return;
    setSkip(true);
  };

  const terminalClasses = classNames(
    'bg-black border border-gray-800 rounded-md font-mono text-green-500 p-4',
    'relative overflow-y-auto cursor-pointer',
    'shadow-[0_0_15px_rgba(0,255,0,0.3)] backdrop-blur-sm',
    className
  );

  const scanlineStyles = `
    .terminal-container {
      position: relative;
      overflow: hidden;
    }
    .scanlines {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,0.3) 50%);
      background-size: 100% 4px;
      z-index: 10;
      pointer-events: none;
      opacity: 0.2;
    }
    .screen-glow {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      box-shadow: inset 0 0 30px rgba(0, 255, 0, 0.5);
      pointer-events: none;
      z-index: 5;
    }
    .blink {
      animation: blink 1s step-end infinite;
    }
    @keyframes blink {
      from, to { opacity: 1 }
      50% { opacity: 0 }
    }
  `;

  return (
    <div className="terminal-container" onClick={handleSkip}>
      <style>{scanlineStyles}</style>
      <div className={terminalClasses} ref={terminalRef}>
        {lines.map((line, i) => (
          <div key={i} className="mb-2">{line}</div>
        ))}
        {animatedLine && (
          <div className="mb-2">
            {typedText}
            {blinkCursor && isTyping && <span className="blink">_</span>}
          </div>
        )}
        {isTyping && (
          <div className="text-xs text-gray-500 mt-2">
            Click to skip typing...
          </div>
        )}
      </div>
      <div className="scanlines"></div>
      <div className="screen-glow"></div>
    </div>
  );
};

export default Terminal;