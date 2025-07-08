import React from 'react';
import AIChat from '@/components/AIChat';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

const ChatInterface = () => {
  const { darkMode, toggleTheme } = useTheme();
  
  return (
    <AIChat 
      apiEndpoint="http://localhost:8000/api/chat" 
      darkMode={darkMode}
      onToggleTheme={toggleTheme}
    />
  );
};

const Index = () => {
  return (
    <ThemeProvider>
      <ChatInterface />
    </ThemeProvider>
  );
};

export default Index;
