import { useState } from 'react';
import TurndownService from 'turndown';
import { Settings, ClipHistoryItem } from '../types';

interface Props {
  settings: Settings;
  onClip: (item: ClipHistoryItem) => void;
}

// Demo content for preview
const DEMO_HTML = `
<div>
  <h1>Sample Article Title</h1>
  <p>This is a <strong>sample article</strong> that demonstrates how the Web Clipper works. 
  It captures the content of any web page and converts it to <em>Markdown</em> format.</p>
  <h2>Key Features</h2>
  <ul>
    <li>One-click page clipping</li>
    <li>Automatic HTML to Markdown conversion</li>
    <li>Send to any API endpoint</li>
    <li>Configurable settings</li>
  </ul>
  <h2>How It Works</h2>
  <p>The extension captures the current page's HTML content, converts it to clean Markdown 
  using Turndown, and sends it to your configured API endpoint via a POST request.</p>
  <blockquote>This is a blockquote that will be properly formatted in Markdown.</blockquote>
  <p>Visit <a href="https://example.com">example.com</a> for more information.</p>
</div>
`;

export default function ClipperPopup({ settings, onClip }: Props) {
  const [isClipping, setIsClipping] = useState(false);
  const [markdown, setMarkdown] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });

  // Remove unnecessary elements
  turndownService.remove(['script', 'style', 'nav', 'footer', 'iframe', 'noscript']);

  const generateMarkdown = (html: string, url: string, title: string): string => {
    let md = '';
    
    if (settings.includeTitle && title) {
      md += `# ${title}\n\n`;
    }
    
    if (settings.includeUrl && url) {
      md += `> Source: [${url}](${url})\n\n`;
    }
    
    if (settings.includeDate) {
      md += `> Clipped on: ${new Date().toLocaleString()}\n\n---\n\n`;
    }
    
    md += turndownService.turndown(html);
    
    return md;
  };

  const handleClip = async () => {
    setIsClipping(true);
    setStatus('idle');
    
    try {
      // Generate markdown from demo content (in real extension, this would be the page content)
      const demoUrl = 'https://example.com/article';
      const demoTitle = 'Sample Article Title';
      const md = generateMarkdown(DEMO_HTML, demoUrl, demoTitle);
      setMarkdown(md);
      
      // Simulate sending to API
      if (settings.apiUrl && settings.apiUrl !== 'https://your-api.com/api/clip') {
        try {
          const response = await fetch(settings.apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(settings.apiKey ? { 'Authorization': `Bearer ${settings.apiKey}` } : {}),
            },
            body: JSON.stringify({
              url: demoUrl,
              title: demoTitle,
              content: md,
              format: settings.format,
              clippedAt: new Date().toISOString(),
            }),
          });
          
          if (response.ok) {
            setStatus('success');
            setStatusMessage('Successfully clipped and sent to API!');
            onClip({
              id: Date.now().toString(),
              title: demoTitle,
              url: demoUrl,
              markdown: md,
              timestamp: Date.now(),
              status: 'success',
            });
          } else {
            throw new Error(`API returned ${response.status}`);
          }
        } catch (err: any) {
          setStatus('success');
          setStatusMessage('Markdown generated! (API not reachable in demo mode)');
          onClip({
            id: Date.now().toString(),
            title: demoTitle,
            url: demoUrl,
            markdown: md,
            timestamp: Date.now(),
            status: 'success',
          });
        }
      } else {
        setStatus('success');
        setStatusMessage('Markdown generated! Configure API URL in Settings to send.');
        onClip({
          id: Date.now().toString(),
          title: demoTitle,
          url: demoUrl,
          markdown: md,
          timestamp: Date.now(),
          status: 'success',
        });
      }
    } catch (err: any) {
      setStatus('error');
      setStatusMessage(err.message || 'Failed to clip page');
      onClip({
        id: Date.now().toString(),
        title: 'Error',
        url: '',
        markdown: '',
        timestamp: Date.now(),
        status: 'error',
        errorMessage: err.message,
      });
    } finally {
      setIsClipping(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(markdown);
    setStatusMessage('Copied to clipboard!');
    setTimeout(() => setStatusMessage(''), 2000);
  };

  return (
    <div className="p-5">
      {/* Current Page Info (simulated) */}
      <div className="bg-slate-700/50 rounded-xl p-3 mb-4 border border-slate-600/50">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded bg-blue-500/20 flex items-center justify-center">
            <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <span className="text-xs text-slate-400">Current page (demo)</span>
        </div>
        <p className="text-sm text-white font-medium truncate">Sample Article Title</p>
        <p className="text-xs text-slate-400 truncate">https://example.com/article</p>
      </div>

      {/* Clip Button */}
      <button
        onClick={handleClip}
        disabled={isClipping}
        className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
          isClipping
            ? 'bg-slate-600 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 active:scale-[0.98]'
        }`}
      >
        {isClipping ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Clipping...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            Clip This Page
          </>
        )}
      </button>

      {/* Status Message */}
      {status !== 'idle' && (
        <div className={`mt-3 p-3 rounded-lg text-sm flex items-center gap-2 ${
          status === 'success' 
            ? 'bg-green-500/10 border border-green-500/30 text-green-400' 
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {status === 'success' ? (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Markdown Preview */}
      {markdown && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <svg className={`w-3 h-3 transition-transform ${showPreview ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Markdown Preview
            </button>
            <button
              onClick={copyToClipboard}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy
            </button>
          </div>
          
          {showPreview && (
            <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-600/50 max-h-48 overflow-y-auto">
              <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">{markdown}</pre>
            </div>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="bg-slate-700/30 rounded-lg p-2 text-center border border-slate-600/30">
          <p className="text-lg font-bold text-white">{markdown.length}</p>
          <p className="text-[10px] text-slate-400">Characters</p>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-2 text-center border border-slate-600/30">
          <p className="text-lg font-bold text-white">{markdown.split('\n').length}</p>
          <p className="text-[10px] text-slate-400">Lines</p>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-2 text-center border border-slate-600/30">
          <p className="text-lg font-bold text-white">{settings.format === 'markdown' ? 'MD' : settings.format.toUpperCase()}</p>
          <p className="text-[10px] text-slate-400">Format</p>
        </div>
      </div>
    </div>
  );
}
