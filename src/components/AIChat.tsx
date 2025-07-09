import React, { useState, useRef, useEffect } from 'react';
import { Send, Moon, Sun, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import MessageRenderer from './MessageRenderer';
import { Message, ResponseType } from '@/types/chat';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentEndpoint, setCurrentEndpoint] = useState(apiEndpoint);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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

  const detectResponseType = (response: any): ResponseType => {
    // Handle object responses from causal agent
    if (typeof response === 'object' && response !== null) {
      // Check for DOT graphs (causal graphs)
      if (response.graph_dot) {
        return 'graphviz';
      }
      
      // Check for Plotly charts
      if (response.ate_plot || response.visualization) {
        return 'plotly';
      }
      
      // Check for direct Plotly structure
      if (response.data && response.layout) {
        return 'plotly';
      }
      
      // Check for markdown content
      if (response.text || response.message || response.note) {
        return 'markdown';
      }
    }
    
    // Check if response is a string
    if (typeof response === 'string') {
      // Check for DOT graph format
      if (response.includes('digraph') && response.includes('{') && response.includes('}')) {
        return 'graphviz';
      }
      
      // Check for Plotly JSON structure
      if (response.trim().startsWith('{') && response.includes('"data"') && response.includes('"layout"')) {
        try {
          const parsed = JSON.parse(response);
          if (parsed.data && parsed.layout) {
            return 'plotly';
          }
        } catch {
          // Not valid JSON, continue
        }
      }
      
      // Check for HTML table
      if (response.includes('<table') || response.includes('<tr') || response.includes('<td')) {
        return 'html';
      }
      
      // Default to markdown
      return 'markdown';
    }
    
    // Default fallback
    return 'markdown';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(currentEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messages: [{ role: 'user', content: userMessage.content }]
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle complex nested structure from Flowise causal agent
      let actualContent = data.response || data;
      let extractedVisualizations: any = null;
      
      // Check for agentFlowExecutedData structure (your causal agent format)
      if (data.agentFlowExecutedData && Array.isArray(data.agentFlowExecutedData)) {
        try {
          // Find the agent node with usedTools
          const agentNode = data.agentFlowExecutedData.find((node: any) => 
            node.data?.output?.usedTools && Array.isArray(node.data.output.usedTools)
          );
          
          if (agentNode) {
            // Get the main text content
            if (agentNode.data.output.content) {
              actualContent = { text: agentNode.data.output.content };
            }
            
            // Extract visualization data from usedTools
            const causalGraphTool = agentNode.data.output.usedTools.find((tool: any) => 
              tool.tool === 'learn_and_plot_causal_graph' && tool.toolOutput
            );
            
            if (causalGraphTool && causalGraphTool.toolOutput) {
              try {
                const toolOutputParsed = JSON.parse(causalGraphTool.toolOutput);
                if (toolOutputParsed[0]?.text) {
                  const graphData = JSON.parse(toolOutputParsed[0].text);
                  if (graphData.graph_dot) {
                    // Combine text and graph data
                    actualContent = {
                      text: actualContent.text || data.text,
                      graph_dot: graphData.graph_dot,
                      threshold_used: graphData.threshold_used,
                      edges_count: graphData.edges_count,
                      adjacency_matrix_shape: graphData.adjacency_matrix_shape,
                      non_zero_weights: graphData.non_zero_weights,
                      selected_features: graphData.selected_features
                    };
                  }
                }
              } catch (error) {
                console.warn('Failed to parse causal graph tool output:', error);
              }
            }
          }
        } catch (error) {
          console.warn('Failed to parse agentFlowExecutedData:', error);
        }
      }
      
      // Fallback to original toolOutput parsing
      if (data.toolOutput && Array.isArray(data.toolOutput)) {
        const first = data.toolOutput[0];
        if (first.type === 'text' && typeof first.text === 'string') {
          try {
            const parsed = JSON.parse(first.text);
            if (parsed.graph_dot || parsed.ate_plot || parsed.visualization || parsed.message) {
              actualContent = parsed;
            } else {
              actualContent = first.text;
            }
          } catch (error) {
            console.warn('toolOutput parse error:', error);
            actualContent = first.text;
          }
        } else {
          actualContent = first;
        }
      }
      
      const responseType = detectResponseType(actualContent);
      
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        content: actualContent,
        responseType,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, agentMessage]);
    } catch (error) {
      console.error('Error calling AI agent:', error);
      toast({
        title: "Error",
        description: "Failed to connect to AI agent. Please check your endpoint configuration.",
        variant: "destructive",
      });
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        responseType: 'markdown',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card shadow-chat">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-gradient-primary rounded-full animate-pulse-glow"></div>
          <h1 className="text-xl font-semibold text-foreground">Causal Agent</h1>
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
        <Card className="m-4 p-4 animate-slide-up">
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              API Endpoint:
            </label>
            <Input
              value={currentEndpoint}
              onChange={(e) => setCurrentEndpoint(e.target.value)}
              placeholder="Enter your AI agent endpoint URL"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Configure the endpoint where your AI agent is hosted. Default: {apiEndpoint}
            </p>
          </div>
        </Card>
      )}

      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.length === 0 && (
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
          )}
          
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
        </div>
      </ScrollArea>

      {/* Input Area */}
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
    </div>
  );
};

export default AIChat;