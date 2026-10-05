export interface Settings {
  apiUrl: string;
  apiKey: string;
  includeUrl: boolean;
  includeTitle: boolean;
  includeDate: boolean;
  format: 'markdown' | 'html' | 'text';
}

export interface ClipHistoryItem {
  id: string;
  title: string;
  url: string;
  markdown: string;
  timestamp: number;
  status: 'success' | 'error';
  errorMessage?: string;
}

export interface ClipRequest {
  url: string;
  title: string;
  content: string;
  format: string;
  clippedAt: string;
}
