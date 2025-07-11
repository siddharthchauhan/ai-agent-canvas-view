import React, { Suspense } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Graphviz } from '@hpcc-js/wasm';
import { ResponseType } from '@/types/chat';

// Lazy load Plotly to reduce bundle size
const Plot = React.lazy(() => import('react-plotly.js'));

interface MessageRendererProps {
  content: any;
  type: ResponseType;
  darkMode?: boolean;
}

const MessageRenderer: React.FC<MessageRendererProps> = ({ 
  content, 
  type, 
  darkMode = false 
}) => {
  const codeStyle = darkMode ? oneDark : oneLight;

  const renderMarkdown = (text: string) => (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code(props) {
            const { children, className, ...rest } = props;
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            
            return isInline ? (
              <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono" {...rest}>
                {children}
              </code>
            ) : (
              <SyntaxHighlighter
                style={codeStyle as any}
                language={match[1]}
                PreTag="div"
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            );
          },
        table: ({ children }) => (
          <div className="overflow-x-auto my-4">
            <table className="min-w-full border border-border rounded-lg">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted">
            {children}
          </thead>
        ),
        th: ({ children }) => (
          <th className="border border-border px-4 py-2 text-left font-medium">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-border px-4 py-2">
            {children}
          </td>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary pl-4 italic">
            {children}
          </blockquote>
        ),
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold mb-4 text-foreground">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-semibold mb-3 text-foreground">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-medium mb-2 text-foreground">
            {children}
          </h3>
        ),
      }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );

  const renderHTML = (html: string) => (
    <div 
      className="prose prose-sm dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );

  const renderPlotly = (data: any) => {
    let plotData;
    
    try {
      // Handle string JSON
      if (typeof data === 'string') {
        plotData = JSON.parse(data);
      } else {
        plotData = data;
      }

      // Ensure we have the required structure
      if (!plotData.data || !plotData.layout) {
        throw new Error('Invalid Plotly data structure');
      }

      // Enhance layout for better appearance
      const enhancedLayout = {
        ...plotData.layout,
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: {
          family: 'Inter, system-ui, sans-serif',
          size: 12,
          color: darkMode ? '#e5e7eb' : '#374151',
          ...plotData.layout.font
        },
        margin: {
          l: 50,
          r: 50,
          t: 50,
          b: 50,
          ...plotData.layout.margin
        }
      };

      const config = {
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
        responsive: true,
        ...plotData.config
      };

      return (
        <Suspense fallback={
          <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
            <div className="text-muted-foreground">Loading chart...</div>
          </div>
        }>
          <div className="my-4 bg-card rounded-lg p-4 shadow-chat">
            <Plot
              data={plotData.data}
              layout={enhancedLayout}
              config={config}
              className="w-full"
              useResizeHandler={true}
              style={{ width: '100%', height: '400px' }}
            />
          </div>
        </Suspense>
      );
    } catch (error) {
      console.error('Error rendering Plotly chart:', error);
      return (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 my-4">
          <p className="text-destructive font-medium mb-2">Chart Rendering Error</p>
          <p className="text-sm text-muted-foreground">
            Failed to render chart. Please check the data format.
          </p>
          <details className="mt-2">
            <summary className="text-sm cursor-pointer text-muted-foreground">
              Show raw data
            </summary>
            <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto">
              {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </div>
      );
    }
  };

  const renderGraphviz = (dotContent: string) => {
    const [svgContent, setSvgContent] = React.useState<string>('');
    const [error, setError] = React.useState<string>('');

    React.useEffect(() => {
      const renderDot = async () => {
        try {
          const graphviz = await Graphviz.load();
          const svg = graphviz.dot(dotContent);
          setSvgContent(svg);
          setError('');
        } catch (err) {
          console.error('Error rendering DOT graph:', err);
          setError(err instanceof Error ? err.message : 'Failed to render graph');
        }
      };

      if (dotContent) {
        renderDot();
      }
    }, [dotContent]);

    if (error) {
      return (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 my-4">
          <p className="text-destructive font-medium mb-2">Graph Rendering Error</p>
          <p className="text-sm text-muted-foreground">
            Failed to render DOT graph: {error}
          </p>
          <details className="mt-2">
            <summary className="text-sm cursor-pointer text-muted-foreground">
              Show DOT source
            </summary>
            <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto">
              {dotContent}
            </pre>
          </details>
        </div>
      );
    }

    if (!svgContent) {
      return (
        <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
          <div className="text-muted-foreground">Rendering graph...</div>
        </div>
      );
    }

    return (
      <div className="my-4 bg-card rounded-lg p-4 shadow-chat">
        <div 
          className="flex justify-center"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>
    );
  };

  const extractContent = (data: any, type: ResponseType) => {
    if (typeof data === 'object' && data !== null) {
      switch (type) {
        case 'plotly':
          // Handle tool outputs with Plotly JSON
          if (data.tool === 'code_interpreter' && data.toolOutput) {
            try {
              return typeof data.toolOutput === 'string' ? JSON.parse(data.toolOutput) : data.toolOutput;
            } catch {
              return data.toolOutput;
            }
          }
          return data.ate_plot || data.visualization || data;
        case 'graphviz':
          return data.graph_dot;
        case 'combined':
          return data; // Return the whole object for combined rendering
        case 'markdown':
          return data.text || data.message || data.note || JSON.stringify(data, null, 2);
        default:
          return data.text || data.message || data.note || data;
      }
    }
    return data;
  };

  // Main rendering logic
  const extractedContent = extractContent(content, type);
  
  // Handle combined content (text + causal graph)
  if (type === 'markdown' && typeof content === 'object' && content?.graph_dot) {
    return (
      <div className="space-y-4">
        {renderMarkdown(extractedContent)}
        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Causal Graph Visualization
          </h4>
          {renderGraphviz(content.graph_dot)}
          {content.edges_count && (
            <div className="mt-2 text-xs text-muted-foreground">
              Graph details: {content.edges_count} edges, threshold: {content.threshold_used}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  switch (type) {
    case 'html':
      return renderHTML(extractedContent);
    case 'plotly':
      return renderPlotly(extractedContent);
    case 'graphviz':
      return renderGraphviz(extractedContent);
    case 'combined':
      return (
        <div className="space-y-4">
          {extractedContent.text && renderMarkdown(extractedContent.text)}
          {extractedContent.graph_dot && (
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Causal Graph Visualization
              </h4>
              {renderGraphviz(extractedContent.graph_dot)}
              {extractedContent.edges_count && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Graph details: {extractedContent.edges_count} edges, threshold: {extractedContent.threshold_used}
                </div>
              )}
            </div>
          )}
          {(extractedContent.data && extractedContent.layout) && (
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Chart Visualization
              </h4>
              {renderPlotly({ data: extractedContent.data, layout: extractedContent.layout })}
            </div>
          )}
        </div>
      );
    case 'markdown':
    default:
      return renderMarkdown(typeof extractedContent === 'string' ? extractedContent : JSON.stringify(extractedContent, null, 2));
  }
};

export default MessageRenderer;