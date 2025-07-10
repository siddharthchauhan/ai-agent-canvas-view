// Function to extract Plotly data from Python code
export const extractPlotlyFromPython = (pythonCode: string): any => {
  try {
    // Look for simple array patterns like "age_data = [74, 63, 45, ...]"
    const simpleArrayMatch = pythonCode.match(/(\w+)\s*=\s*\[([0-9\s,]+)\]/);
    
    // Look for data object arrays
    const dataMatch = pythonCode.match(/data\s*=\s*(\[[\s\S]*?\])/);
    
    // Look for go.Figure patterns
    const goFigureMatch = pythonCode.match(/go\.Figure\(data=\[go\.(Bar|Scatter|Line)\((.*?)\)\]/);
    
    // Look for px (plotly express) patterns  
    const pxMatch = pythonCode.match(/px\.(scatter|bar|line|histogram)\(([^)]*)\)/);

    let plotlyData: any = null;

    // Handle px.bar with DataFrame processing (like the age distribution example)
    if (pxMatch && simpleArrayMatch) {
      const chartType = pxMatch[1];
      const params = pxMatch[2];
      
      // Extract parameters from px.bar call
      const titleMatch = params.match(/title=['"]([^'"]+)['"]/);
      const xMatch = params.match(/x=['"]([^'"]+)['"]/);
      const yMatch = params.match(/y=['"]([^'"]+)['"]/);
      const colorMatch = params.match(/color=['"]([^'"]+)['"]/);
      const colorScaleMatch = params.match(/color_continuous_scale=['"]([^'"]+)['"]/);
      
      // Parse the simple array
      const arrayName = simpleArrayMatch[1];
      const arrayValues = simpleArrayMatch[2].split(',').map(v => parseInt(v.trim()));
      
      // Check for value_counts() pattern - create frequency distribution
      if (pythonCode.includes('value_counts()')) {
        // Create frequency distribution data
        const freq: { [key: number]: number } = {};
        arrayValues.forEach(val => {
          freq[val] = (freq[val] || 0) + 1;
        });
        
        const sortedKeys = Object.keys(freq).map(k => parseInt(k)).sort((a, b) => a - b);
        const counts = sortedKeys.map(k => freq[k]);
        
        plotlyData = {
          data: [{
            x: sortedKeys,
            y: counts,
            type: 'bar',
            marker: {
              color: counts,
              colorscale: colorScaleMatch?.[1] || 'Turbo',
              showscale: false
            }
          }],
          layout: {
            title: titleMatch?.[1] || 'Chart',
            xaxis: { title: xMatch?.[1] || 'X Axis' },
            yaxis: { title: yMatch?.[1] || 'Y Axis' },
            margin: { t: 60, r: 40, b: 60, l: 60 }
          }
        };
      }
    }
    
    // Handle go.Figure with go.Bar pattern
    else if (goFigureMatch) {
      const chartType = goFigureMatch[1].toLowerCase();
      const params = goFigureMatch[2];
      
      // Extract x and y from go.Bar parameters
      const xMatch = params.match(/x=([^,)]+)/);
      const yMatch = params.match(/y=([^,)]+)/);
      const markerColorMatch = params.match(/marker_color=['"]([^'"]+)['"]/);
      
      // Extract title from update_layout
      const titleMatch = pythonCode.match(/title=['"]([^'"]+)['"]/);
      const xAxisMatch = pythonCode.match(/xaxis_title=['"]([^'"]+)['"]/);
      const yAxisMatch = pythonCode.match(/yaxis_title=['"]([^'"]+)['"]/);

      if (simpleArrayMatch && xMatch && yMatch) {
        // Parse the simple array
        const arrayName = simpleArrayMatch[1];
        const arrayValues = simpleArrayMatch[2].split(',').map(v => parseInt(v.trim()));
        
        // Check for frequency distribution pattern
        if (pythonCode.includes('value_counts()') && pythonCode.includes('sort_index()')) {
          // Create frequency distribution data
          const freq: { [key: number]: number } = {};
          arrayValues.forEach(val => {
            freq[val] = (freq[val] || 0) + 1;
          });
          
          const sortedKeys = Object.keys(freq).map(k => parseInt(k)).sort((a, b) => a - b);
          
          plotlyData = {
            data: [{
              x: sortedKeys,
              y: sortedKeys.map(k => freq[k]),
              type: 'bar',
              marker: {
                color: markerColorMatch ? markerColorMatch[1] : 'mediumvioletred'
              }
            }],
            layout: {
              title: titleMatch?.[1] || 'Chart',
              xaxis: { title: xAxisMatch?.[1] || 'X Axis' },
              yaxis: { title: yAxisMatch?.[1] || 'Y Axis' },
              template: 'plotly_white',
              margin: { t: 60, r: 40, b: 60, l: 60 }
            }
          };
        }
      }
    }
    
    // Handle px (plotly express) patterns with data objects
    else if (pxMatch && dataMatch) {
      let dataString = dataMatch[1];
      
      // Clean up the data string - handle truncated data
      if (dataString.includes('...')) {
        console.warn('Data appears to be truncated in Python code');
        return null;
      }

      // Try to parse the data array as JSON
      const data = JSON.parse(dataString.replace(/'/g, '"'));
      
      const plotType = pxMatch[1];
      
      // Extract plot parameters
      const titleMatch = pythonCode.match(/title=['"]([^'"]+)['"]/);
      const xMatch = pythonCode.match(/x=['"]([^'"]+)['"]/);
      const yMatch = pythonCode.match(/y=['"]([^'"]+)['"]/);
      const colorMatch = pythonCode.match(/color=['"]([^'"]+)['"]/);

      plotlyData = {
        data: [{
          x: data.map((item: any) => item[xMatch?.[1] || 'x']),
          y: data.map((item: any) => item[yMatch?.[1] || 'y']),
          type: plotType === 'scatter' ? 'scatter' : plotType,
          mode: plotType === 'scatter' ? 'markers' : undefined,
          marker: colorMatch ? {
            color: data.map((item: any) => item[colorMatch[1]]),
            colorscale: 'Viridis',
            showscale: true
          } : undefined
        }],
        layout: {
          title: titleMatch?.[1] || 'Chart',
          xaxis: { title: xMatch?.[1] || 'X Axis' },
          yaxis: { title: yMatch?.[1] || 'Y Axis' },
          margin: { t: 40, r: 40, b: 40, l: 40 }
        }
      };
    }

    return plotlyData;
  } catch (error) {
    console.warn('Failed to extract Plotly data from Python code:', error);
    return null;
  }
};