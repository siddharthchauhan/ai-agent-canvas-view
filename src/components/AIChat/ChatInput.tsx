import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSubmit, isLoading }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    onSubmit(input);
    setInput('');
  };

  return (
    <div className="border-t bg-card p-4 shadow-elevated">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="flex space-x-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message here..."
            disabled={isLoading}
            className="flex-1 bg-background border-border focus:ring-primary"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            variant="chat"
            size="chat"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Send messages to your AI agent for analysis, charts, and insights
        </p>
      </form>
    </div>
  );
};

export default ChatInput;