import { ResponseType } from '@/types/chat';

export const detectResponseType = (response: any): ResponseType => {
  // Handle object responses from causal agent
  if (typeof response === 'object' && response !== null) {
    // Check for combined content (text + graph/chart)
    if (response.text && (response.graph_dot || (response.data && response.layout))) {
      return 'combined'; // Will handle both text and visualization
    }
    
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