import React from 'react';
import { Message } from '@/types/chat';
import MessageRenderer from '../MessageRenderer';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
  if (messages.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gradient-primary rounded-full mx-auto mb-4 flex items-center justify-center">
          <div className="w-8 h-8 bg-primary-foreground rounded-full"></div>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          Welcome to Your AI Agent
        </h3>
        <p className="text-muted-foreground">
          Start a conversation by typing a message below. I can help with text, tables, and data visualizations.
        </p>
      </div>
    );
  }

  return (
    <>
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
        >
          <div
            className={`max-w-[80%] rounded-xl p-4 ${
              message.type === 'user'
                ? 'bg-chat-user text-chat-user-foreground ml-12'
                : 'bg-chat-agent text-chat-agent-foreground border border-border mr-12'
            } shadow-chat`}
          >
            {message.type === 'agent' && (
              <MessageRenderer 
                content={message.content} 
                type={message.responseType || 'markdown'} 
              />
            )}
            {message.type === 'user' && (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
            
            <div className="mt-2 text-xs opacity-70">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </div>
      ))}
      
      {isLoading && (
        <div className="flex justify-start animate-fade-in">
          <div className="bg-chat-agent text-chat-agent-foreground border border-border rounded-xl p-4 mr-12 shadow-chat">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-sm text-muted-foreground">AI is thinking...</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MessageList;