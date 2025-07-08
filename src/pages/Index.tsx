import React from 'react';
import AIChat from '@/components/AIChat';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

const ChatInterface = () => {
  const { darkMode, toggleTheme } = useTheme();
  
  return (
    <AIChat 
      apiEndpoint="http://localhost:3000/api/v1/prediction/4dda3590-83ea-4a9e-b7bf-ef2f1d35ed3d" 
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
