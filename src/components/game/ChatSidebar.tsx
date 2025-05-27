import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, X } from 'lucide-react';
import Button from '../ui/Button';
import { useGameStore } from '../../store';

interface Message {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: Date;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onClose }) => {
  const { currentUser, players } = useGameStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Mock sending a message
  const handleSendMessage = () => {
    if (!input.trim() || !currentUser) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      userId: currentUser.id,
      username: currentUser.username,
      text: input.trim(),
      timestamp: new Date()
    };
    
    setMessages([...messages, newMessage]);
    setInput('');
  };
  
  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  return (
    <div className={`fixed inset-y-0 right-0 w-full md:w-80 bg-gray-900 border-l border-gray-800 shadow-xl z-40 transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex flex-col h-full">
        <div className="border-b border-gray-800 p-4 flex justify-between items-center">
          <h2 className="font-mono text-lg text-green-500 flex items-center">
            <MessageSquare size={18} className="mr-2" />
            Player Chat
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="text-gray-500 text-center py-4 text-sm">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => {
                const isCurrentUser = message.userId === currentUser?.id;
                const sender = players.find(p => p.id === message.userId);
                
                return (
                  <div 
                    key={message.id} 
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-lg p-2 ${isCurrentUser ? 'bg-green-900/50 text-white' : 'bg-gray-800 text-gray-200'}`}>
                      {!isCurrentUser && (
                        <div className="font-mono text-xs text-amber-500 mb-1">
                          {message.username}
                        </div>
                      )}
                      <div className="text-sm">{message.text}</div>
                      <div className="text-right text-xs text-gray-500 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        <div className="border-t border-gray-800 p-3">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              className="flex-grow bg-gray-800 border border-gray-700 rounded-md p-2 text-white text-sm resize-none min-h-[60px]"
            />
            <Button
              variant="primary"
              onClick={handleSendMessage}
              disabled={!input.trim()}
              icon={<Send size={16} />}
              className="self-end"
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;