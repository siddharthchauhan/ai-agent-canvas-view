import React, { useState, useRef, useEffect } from 'react';
import { Moon, Sun, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIChat } from '@/hooks/useAIChat';
import SettingsPanel from './AIChat/SettingsPanel';
import MessageList from './AIChat/MessageList';
import ChatInput from './AIChat/ChatInput';

interface AIChatProps {
  apiEndpoint?: string;
  darkMode?: boolean;
  onToggleTheme?: () => void;
}

const AIChat: React.FC<AIChatProps> = ({ 
  apiEndpoint = '/api/agent', 
  darkMode = false,
  onToggleTheme 
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    isLoading,
    currentEndpoint,
    setCurrentEndpoint,
    handleSubmit
  } = useAIChat({ apiEndpoint });

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card shadow-chat">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-gradient-primary rounded-full animate-pulse-glow"></div>
          <h1 className="text-xl font-semibold text-foreground">Business Intelligence Tool</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          
          {onToggleTheme && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleTheme}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          currentEndpoint={currentEndpoint}
          setCurrentEndpoint={setCurrentEndpoint}
          defaultEndpoint={apiEndpoint}
        />
      )}

      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          <MessageList messages={messages} isLoading={isLoading} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <ChatInput onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
};

export default AIChat;