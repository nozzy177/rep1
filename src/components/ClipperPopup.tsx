import { useState } from 'react';
import Defuddle from 'defuddle/full';
import { Settings, ClipHistoryItem } from '../types';

interface Props {
  settings: Settings;
  onClip: (item: ClipHistoryItem) => void;
}

// Demo content for preview — simulates a real web page with clutter
const DEMO_HTML = `
<!DOCTYPE html>
<html>
<head><title>How to Build Better Habits: A Science-Based Guide</title></head>
<body>
  <nav class="main-nav">
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
  </nav>
  
  <aside class="sidebar">
    <div class="ad-banner">Subscribe to our newsletter!</div>
    <div class="related-posts">
      <h3>Related Articles</h3>
      <ul>
        <li><a href="/post-1">Another post</a></li>
        <li><a href="/post-2">Yet another post</a></li>
      </ul>
    </div>
  </aside>

  <article class="post-content">
    <h1>How to Build Better Habits: A Science-Based Guide</h1>
    <p class="meta">By <strong>Jane Smith</strong> • Published on January 15, 2024 • 8 min read</p>
    
    <p>Building better habits is one of the most impactful things you can do for your long-term 
    well-being. Research in <em>behavioral psychology</em> shows that small, consistent changes 
    lead to remarkable results over time.</p>
    
    <h2>The Science Behind Habit Formation</h2>
    <p>Every habit follows a four-step loop: <strong>cue, craving, response, and reward</strong>. 
    Understanding this loop is the key to changing your behavior.</p>
    
    <blockquote>
      <p>"We are what we repeatedly do. Excellence, then, is not an act, but a habit." — Aristotle</p>
    </blockquote>
    
    <h2>Five Strategies That Actually Work</h2>
    <ol>
      <li><strong>Start impossibly small</strong> — Make the habit so easy you can't say no</li>
      <li><strong>Habit stacking</strong> — Attach new habits to existing ones</li>
      <li><strong>Environment design</strong> — Make good cues visible and bad cues invisible</li>
      <li><strong>The two-minute rule</strong> — Scale any habit down to two minutes</li>
      <li><strong>Track your progress</strong> — What gets measured gets managed</li>
    </ol>
    
    <h3>Example: Building a Reading Habit</h3>
    <p>Let's say you want to read more books. Instead of committing to "read 30 minutes a day," 
    start with "read one page before bed." This removes the friction and makes it almost 
    effortless to begin.</p>
    
    <pre><code class="language-js">// Track your habit streak
const habitTracker = {
  reading: { streak: 0, lastDate: null },
  log: function(date) {
    this.reading.streak++;
    this.reading.lastDate = date;
  }
};</code></pre>
    
    <p>After 30 days of reading just one page, you'll likely find yourself reading much more. 
    The habit has taken root.</p>
    
    <h2>Common Pitfalls to Avoid</h2>
    <ul>
      <li>Trying to change too many habits at once</li>
      <li>Relying on motivation instead of systems</li>
      <li>Not designing your environment for success</li>
      <li>Giving up after a single missed day</li>
    </ul>
    
    <h2>Conclusion</h2>
    <p>The secret to building better habits isn't willpower — it's strategy. Start small, 
    be consistent, and design your environment to support the person you want to become.</p>
    
    <div class="comments-section">
      <h3>Comments (47)</h3>
      <div class="comment">
        <strong>User123:</strong> Great article! I've been using habit stacking for months.
      </div>
      <div class="comment">
        <strong>Reader42:</strong> The two-minute rule changed my life.
      </div>
    </div>
  </article>
  
  <footer>
    <p>© 2024 Blog. All rights reserved.</p>
    <nav>
      <a href="/privacy">Privacy</a>
      <a href="/terms">Terms</a>
    </nav>
  </footer>
</body>
</html>
`;

export default function ClipperPopup({ settings, onClip }: Props) {
  const [isClipping, setIsClipping] = useState(false);
  const [markdown, setMarkdown] = useState('');
  const [metadata, setMetadata] = useState<{
    title?: string;
    author?: string;
    published?: string;
    description?: string;
    wordCount?: number;
    parseTime?: number;
  }>({});
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const generateMarkdown = async (html: string, url: string): Promise<{
    markdown: string;
    metadata: typeof metadata;
  }> => {
    // Parse HTML string into a DOM Document
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Use Defuddle to extract main content and convert to Markdown
    const defuddle = new Defuddle(doc, {
      url,
      markdown: true,
      removeHiddenElements: true,
      removeLowScoring: true,
      removeSmallImages: true,
      standardize: true,
    });

    const result = defuddle.parse();

    // Build final markdown with optional frontmatter
    let md = '';

    if (settings.includeTitle && result.title) {
      md += `# ${result.title}\n\n`;
    }

    if (settings.includeUrl && url) {
      md += `> Source: [${url}](${url})\n\n`;
    }

    if (settings.includeDate) {
      const dateStr = result.published || new Date().toLocaleString();
      md += `> Clipped on: ${dateStr}\n\n---\n\n`;
    }

    // Add author if available
    if (result.author) {
      md += `> Author: ${result.author}\n\n`;
    }

    // Defuddle's content is already Markdown when markdown: true
    md += result.content || '';

    return {
      markdown: md,
      metadata: {
        title: result.title,
        author: result.author,
        published: result.published,
        description: result.description,
        wordCount: result.wordCount,
        parseTime: result.parseTime,
      },
    };
  };

  const handleClip = async () => {
    setIsClipping(true);
    setStatus('idle');

    try {
      const demoUrl = 'https://example.com/habits-guide';
      const { markdown: md, metadata: meta } = await generateMarkdown(DEMO_HTML, demoUrl);
      setMarkdown(md);
      setMetadata(meta);

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
              title: meta.title || 'Untitled',
              author: meta.author,
              published: meta.published,
              content: md,
              format: settings.format,
              clippedAt: new Date().toISOString(),
            }),
          });

          if (response.ok) {
            setStatus('success');
            setStatusMessage('Successfully clipped and sent to API!');
          } else {
            throw new Error(`API returned ${response.status}`);
          }
        } catch (err: any) {
          setStatus('success');
          setStatusMessage('Markdown generated! (API not reachable in demo mode)');
        }
      } else {
        setStatus('success');
        setStatusMessage('Markdown generated! Configure API URL in Settings to send.');
      }

      onClip({
        id: Date.now().toString(),
        title: meta.title || 'Untitled',
        url: demoUrl,
        markdown: md,
        timestamp: Date.now(),
        status: 'success',
      });
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
        <p className="text-sm text-white font-medium truncate">How to Build Better Habits</p>
        <p className="text-xs text-slate-400 truncate">https://example.com/habits-guide</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Defuddle
          </span>
          <span className="text-[10px] text-slate-500">extracts main content • removes clutter</span>
        </div>
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
            Extracting content...
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

      {/* Extracted Metadata */}
      {metadata.title && (
        <div className="mt-3 bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 font-medium">Extracted Metadata</p>
          <div className="space-y-1">
            {metadata.title && (
              <p className="text-xs text-slate-300 truncate">
                <span className="text-slate-500">Title:</span> {metadata.title}
              </p>
            )}
            {metadata.author && (
              <p className="text-xs text-slate-300">
                <span className="text-slate-500">Author:</span> {metadata.author}
              </p>
            )}
            {metadata.published && (
              <p className="text-xs text-slate-300">
                <span className="text-slate-500">Published:</span> {metadata.published}
              </p>
            )}
            {metadata.description && (
              <p className="text-xs text-slate-400 truncate">
                <span className="text-slate-500">Description:</span> {metadata.description}
              </p>
            )}
          </div>
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
      <div className="mt-4 grid grid-cols-4 gap-2">
        <div className="bg-slate-700/30 rounded-lg p-2 text-center border border-slate-600/30">
          <p className="text-lg font-bold text-white">{markdown.length}</p>
          <p className="text-[10px] text-slate-400">Chars</p>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-2 text-center border border-slate-600/30">
          <p className="text-lg font-bold text-white">{metadata.wordCount || markdown.split(/\s+/).filter(Boolean).length}</p>
          <p className="text-[10px] text-slate-400">Words</p>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-2 text-center border border-slate-600/30">
          <p className="text-lg font-bold text-white">{metadata.parseTime ? `${metadata.parseTime}ms` : '—'}</p>
          <p className="text-[10px] text-slate-400">Parse</p>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-2 text-center border border-slate-600/30">
          <p className="text-lg font-bold text-white">{settings.format === 'markdown' ? 'MD' : settings.format.toUpperCase()}</p>
          <p className="text-[10px] text-slate-400">Format</p>
        </div>
      </div>
    </div>
  );
}
