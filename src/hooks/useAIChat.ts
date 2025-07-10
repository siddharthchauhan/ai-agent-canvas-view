import { useState } from 'react';
import { Message } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';
import { extractPlotlyFromPython } from '@/hooks/usePlotlyExtraction';
import { detectResponseType } from '@/utils/responseTypeDetection';

interface UseAIChatProps {
  apiEndpoint?: string;
}

export const useAIChat = ({ apiEndpoint = '/api/agent' }: UseAIChatProps = {}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentEndpoint, setCurrentEndpoint] = useState(apiEndpoint);
  const { toast } = useToast();

  const handleSubmit = async (input: string) => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(currentEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          question: userMessage.content
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle complex nested structure from Flowise causal agent
      let actualContent = data.response || data;
      
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
            
            // Look for code_interpreter tools with Plotly code (use latest one)
            const codeInterpreterTools = agentNode.data.output.usedTools.filter((tool: any) => 
              tool.tool === 'code_interpreter' && tool.toolInput?.input
            );
            
            if (codeInterpreterTools.length > 0) {
              const latestCodeTool = codeInterpreterTools[codeInterpreterTools.length - 1];
              const pythonCode = latestCodeTool.toolInput.input;
              
              // Extract Plotly data from Python code
              const plotlyData = extractPlotlyFromPython(pythonCode);
              if (plotlyData) {
                // Combine text and Plotly data
                actualContent = {
                  text: actualContent.text || data.text,
                  data: plotlyData.data,
                  layout: plotlyData.layout
                };
              }
            }
            
            // Also check for causal graph tools
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
                      ...actualContent,
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

  return {
    messages,
    isLoading,
    currentEndpoint,
    setCurrentEndpoint,
    handleSubmit
  };
};