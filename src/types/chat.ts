export type ResponseType = 'markdown' | 'html' | 'plotly';

export interface Message {
  id: string;
  type: 'user' | 'agent';
  content: any;
  responseType?: ResponseType;
  timestamp: Date;
}

export interface PlotlyChart {
  data: any[];
  layout: any;
  config?: any;
}