import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const MANIFEST_JSON = `{
  "manifest_version": 3,
  "name": "Web Clipper",
  "version": "1.1.0",
  "description": "Clip web pages and send them as Markdown to your API. Powered by Defuddle for intelligent content extraction.",
  "permissions": ["activeTab", "storage"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}`;

const BACKGROUND_JS = `// Background service worker
chrome.runtime.onInstalled.addListener(() => {
  // Set default settings
  chrome.storage.sync.get(['settings'], (result) => {
    if (!result.settings) {
      chrome.storage.sync.set({
        settings: {
          apiUrl: '',
          apiKey: '',
          includeUrl: true,
          includeTitle: true,
          includeDate: true,
          format: 'markdown'
        }
      });
    }
  });
});
`;

const POPUP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      width: 400px; 
      min-height: 320px; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #1e293b; 
      color: #e2e8f0; 
      padding: 16px; 
    }
    .header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    .header h1 { font-size: 16px; font-weight: 600; }
    .header .icon { width: 28px; height: 28px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; }
    .header .badge { font-size: 9px; background: rgba(139,92,246,0.2); color: #a78bfa; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(139,92,246,0.3); }
    .page-info { background: #334155; border-radius: 8px; padding: 10px; margin-bottom: 12px; border: 1px solid #475569; }
    .page-info .title { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .page-info .url { font-size: 11px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
    .clip-btn { width: 100%; padding: 12px; border: none; border-radius: 10px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; box-shadow: 0 4px 12px rgba(139,92,246,0.3); }
    .clip-btn:hover { opacity: 0.9; }
    .clip-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .status { margin-top: 10px; padding: 8px 10px; border-radius: 8px; font-size: 12px; display: none; }
    .status.success { display: block; background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); color: #4ade80; }
    .status.error { display: block; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #f87171; }
    .metadata { margin-top: 10px; background: rgba(51,65,85,0.5); border-radius: 8px; padding: 8px 10px; border: 1px solid rgba(71,85,105,0.5); display: none; }
    .metadata.visible { display: block; }
    .metadata .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 4px; }
    .metadata .item { font-size: 11px; color: #cbd5e1; margin-bottom: 2px; }
    .metadata .item span { color: #64748b; }
    .preview { margin-top: 12px; display: none; }
    .preview.visible { display: block; }
    .preview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .preview-header span { font-size: 11px; color: #94a3b8; }
    .copy-btn { font-size: 11px; color: #60a5fa; background: none; border: none; cursor: pointer; padding: 2px 6px; border-radius: 4px; }
    .copy-btn:hover { background: rgba(96,165,250,0.1); }
    .preview-content { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 10px; max-height: 180px; overflow-y: auto; }
    .preview-content pre { font-size: 11px; white-space: pre-wrap; color: #cbd5e1; font-family: 'SF Mono', 'Fira Code', monospace; line-height: 1.5; }
    .stats { margin-top: 12px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
    .stat { background: rgba(51,65,85,0.3); border-radius: 6px; padding: 6px; text-align: center; border: 1px solid rgba(71,85,105,0.3); }
    .stat .value { font-size: 14px; font-weight: 700; color: white; }
    .stat .label { font-size: 9px; color: #64748b; margin-top: 2px; }
    .settings-link { display: block; text-align: center; margin-top: 14px; font-size: 11px; color: #94a3b8; text-decoration: none; padding: 6px; border-radius: 6px; }
    .settings-link:hover { color: #e2e8f0; background: rgba(51,65,85,0.3); }
    .settings-form { display: none; }
    .settings-form.visible { display: block; }
    .form-group { margin-bottom: 12px; }
    .form-group label { display: block; font-size: 12px; color: #94a3b8; margin-bottom: 4px; font-weight: 500; }
    .form-group input { width: 100%; padding: 8px 10px; background: #334155; border: 1px solid #475569; border-radius: 8px; color: #e2e8f0; font-size: 12px; }
    .form-group input:focus { outline: none; border-color: #8b5cf6; box-shadow: 0 0 0 2px rgba(139,92,246,0.2); }
    .form-group .hint { font-size: 10px; color: #64748b; margin-top: 3px; }
    .save-btn { width: 100%; padding: 10px; border: none; border-radius: 8px; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; font-size: 13px; font-weight: 600; cursor: pointer; margin-bottom: 8px; }
    .save-btn:hover { opacity: 0.9; }
    .powered-by { text-align: center; margin-top: 8px; font-size: 10px; color: #475569; }
    .powered-by a { color: #64748b; text-decoration: none; }
    .powered-by a:hover { color: #94a3b8; }
  </style>
</head>
<body>
  <div class="header">
    <div class="icon">📋</div>
    <h1>Web Clipper</h1>
    <span class="badge">Defuddle</span>
  </div>

  <div id="main-view">
    <div class="page-info">
      <div class="title" id="page-title">Loading...</div>
      <div class="url" id="page-url">...</div>
    </div>

    <button class="clip-btn" id="clip-btn" onclick="clipPage()">📋 Clip This Page</button>
    
    <div class="status" id="status"></div>
    
    <div class="metadata" id="metadata">
      <div class="label">Extracted Metadata</div>
      <div id="metadata-content"></div>
    </div>
    
    <div class="preview" id="preview">
      <div class="preview-header">
        <span>📝 Markdown Output</span>
        <button class="copy-btn" onclick="copyMarkdown()">📋 Copy</button>
      </div>
      <div class="preview-content">
        <pre id="markdown-output"></pre>
      </div>
    </div>

    <div class="stats" id="stats" style="display:none;">
      <div class="stat"><div class="value" id="stat-chars">—</div><div class="label">Chars</div></div>
      <div class="stat"><div class="value" id="stat-words">—</div><div class="label">Words</div></div>
      <div class="stat"><div class="value" id="stat-time">—</div><div class="label">Parse</div></div>
      <div class="stat"><div class="value" id="stat-format">MD</div><div class="label">Format</div></div>
    </div>

    <a href="#" class="settings-link" onclick="showSettings(event)">⚙️ Settings</a>
    <div class="powered-by">Powered by <a href="https://github.com/kepano/defuddle" target="_blank">Defuddle</a></div>
  </div>

  <div class="settings-form" id="settings-form">
    <div class="form-group">
      <label>API Endpoint URL</label>
      <input type="url" id="api-url" placeholder="https://your-api.com/api/clip">
      <div class="hint">Content will be POSTed here as JSON</div>
    </div>
    <div class="form-group">
      <label>API Key (optional)</label>
      <input type="password" id="api-key" placeholder="Bearer token">
      <div class="hint">Sent as Authorization: Bearer header</div>
    </div>
    <button class="save-btn" onclick="saveSettings()">💾 Save Settings</button>
    <a href="#" class="settings-link" onclick="showMain(event)">← Back to Clipper</a>
  </div>

  <script src="defuddle.min.js"></script>
  <script src="popup.js"></script>
</body>
</html>`;

const POPUP_JS = `// Get current tab info
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]) {
    document.getElementById('page-title').textContent = tabs[0].title || 'Untitled';
    document.getElementById('page-url').textContent = tabs[0].url || '';
  }
});

// Load settings
chrome.storage.sync.get(['settings'], (result) => {
  if (result.settings) {
    document.getElementById('api-url').value = result.settings.apiUrl || '';
    document.getElementById('api-key').value = result.settings.apiKey || '';
  }
});

let currentMarkdown = '';

async function clipPage() {
  const btn = document.getElementById('clip-btn');
  const status = document.getElementById('status');
  const metadata = document.getElementById('metadata');
  const preview = document.getElementById('preview');
  const stats = document.getElementById('stats');
  
  btn.disabled = true;
  btn.textContent = '⏳ Extracting content...';
  status.className = 'status';
  status.style.display = 'none';
  metadata.classList.remove('visible');
  preview.classList.remove('visible');
  stats.style.display = 'none';

  try {
    // Get page content by executing script in the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        return {
          title: document.title,
          url: window.location.href,
          html: document.documentElement.outerHTML
        };
      }
    });

    const pageData = results[0].result;
    
    // Parse HTML into a Document using DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(pageData.html, 'text/html');
    
    // Use Defuddle to extract main content and convert to Markdown
    const defuddle = new Defuddle(doc, {
      url: pageData.url,
      markdown: true,
      removeHiddenElements: true,
      removeLowScoring: true,
      removeSmallImages: true,
      standardize: true,
    });
    
    const result = defuddle.parse();
    
    // Build final markdown with frontmatter
    const settings = (await chrome.storage.sync.get(['settings'])).settings || {};
    let markdown = '';
    
    if (settings.includeTitle !== false && result.title) {
      markdown += '# ' + result.title + '\\n\\n';
    }
    if (settings.includeUrl !== false) {
      markdown += '> Source: [' + pageData.url + '](' + pageData.url + ')\\n\\n';
    }
    if (settings.includeDate !== false) {
      const dateStr = result.published || new Date().toLocaleString();
      markdown += '> Clipped: ' + dateStr + '\\n\\n---\\n\\n';
    }
    if (result.author) {
      markdown += '> Author: ' + result.author + '\\n\\n';
    }
    
    // Defuddle's content is already Markdown when markdown: true
    markdown += result.content || '';
    currentMarkdown = markdown;
    
    // Show metadata
    const metadataContent = document.getElementById('metadata-content');
    let metaHtml = '';
    if (result.title) metaHtml += '<div class="item"><span>Title:</span> ' + result.title + '</div>';
    if (result.author) metaHtml += '<div class="item"><span>Author:</span> ' + result.author + '</div>';
    if (result.published) metaHtml += '<div class="item"><span>Published:</span> ' + result.published + '</div>';
    if (result.description) metaHtml += '<div class="item"><span>Desc:</span> ' + result.description.substring(0, 100) + '...</div>';
    if (result.wordCount) metaHtml += '<div class="item"><span>Words:</span> ' + result.wordCount + '</div>';
    metadataContent.innerHTML = metaHtml;
    metadata.classList.add('visible');
    
    // Show preview
    document.getElementById('markdown-output').textContent = markdown;
    preview.classList.add('visible');
    
    // Show stats
    document.getElementById('stat-chars').textContent = markdown.length;
    document.getElementById('stat-words').textContent = result.wordCount || markdown.split(/\\s+/).filter(Boolean).length;
    document.getElementById('stat-time').textContent = result.parseTime ? result.parseTime + 'ms' : '—';
    stats.style.display = 'grid';
    
    // Send to API if configured
    if (settings.apiUrl) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (settings.apiKey) {
          headers['Authorization'] = 'Bearer ' + settings.apiKey;
        }
        
        const response = await fetch(settings.apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url: pageData.url,
            title: result.title || pageData.title,
            author: result.author || null,
            published: result.published || null,
            description: result.description || null,
            content: markdown,
            format: 'markdown',
            clippedAt: new Date().toISOString()
          })
        });
        
        if (response.ok) {
          status.textContent = '✅ Clipped and sent to API successfully!';
          status.className = 'status success';
        } else {
          status.textContent = '✅ Clipped! (API returned ' + response.status + ')';
          status.className = 'status success';
        }
      } catch (err) {
        status.textContent = '✅ Clipped! (Could not reach API: ' + err.message + ')';
        status.className = 'status success';
      }
    } else {
      status.textContent = '✅ Clipped! Configure API URL in Settings to auto-send.';
      status.className = 'status success';
    }
    
  } catch (err) {
    status.textContent = '❌ Error: ' + err.message;
    status.className = 'status error';
  }
  
  btn.disabled = false;
  btn.textContent = '📋 Clip This Page';
}

function copyMarkdown() {
  navigator.clipboard.writeText(currentMarkdown).then(() => {
    const btn = document.querySelector('.copy-btn');
    btn.textContent = '✅ Copied!';
    setTimeout(() => { btn.textContent = '📋 Copy'; }, 2000);
  });
}

function showSettings(e) {
  e.preventDefault();
  document.getElementById('main-view').style.display = 'none';
  document.getElementById('settings-form').classList.add('visible');
}

function showMain(e) {
  e.preventDefault();
  document.getElementById('main-view').style.display = 'block';
  document.getElementById('settings-form').classList.remove('visible');
}

function saveSettings() {
  const settings = {
    apiUrl: document.getElementById('api-url').value,
    apiKey: document.getElementById('api-key').value,
    includeUrl: true,
    includeTitle: true,
    includeDate: true,
    format: 'markdown'
  };
  chrome.storage.sync.set({ settings }, () => {
    const btn = document.querySelector('.save-btn');
    btn.textContent = '✅ Saved!';
    setTimeout(() => {
      btn.textContent = '💾 Save Settings';
      showMain(new Event('click'));
    }, 1000);
  });
}
`;

const README_MD = `# Web Clipper Chrome Extension

> Powered by [Defuddle](https://github.com/kepano/defuddle) — intelligent content extraction

## What is this?

A Chrome extension that extracts the **main content** from any web page (removing navigation, ads, sidebars, comments, etc.) and converts it to clean Markdown. The result is sent to your configured API endpoint.

## Features

- 🧠 **Smart content extraction** via Defuddle — removes clutter automatically
- 📝 **Clean Markdown output** with proper formatting
- 📊 **Metadata extraction** — title, author, publish date, description
- 🔗 **API integration** — POST clipped content to any endpoint
- 🔑 **Authentication** — Bearer token support
- ⚡ **Fast** — content extraction happens locally in the browser

## Installation

1. Download and extract the ZIP file
2. Download Defuddle library:
   - Go to https://cdn.jsdelivr.net/npm/defuddle@0.19.4/dist/index.full.js
   - Save it as \`defuddle.min.js\` in the extension folder
3. Open Chrome → \`chrome://extensions/\`
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked"
6. Select the extracted folder
7. The extension icon will appear in your toolbar

## Usage

1. Navigate to any web page
2. Click the Web Clipper extension icon
3. Click "Clip This Page"
4. Defuddle extracts the main content and converts to Markdown
5. Review the metadata and preview
6. If an API URL is configured, content is sent automatically

## Configuration

Click "Settings" in the popup to configure:
- **API Endpoint URL**: Where to send clipped content (POST request)
- **API Key**: Optional Bearer token for authentication

## API Format

The extension sends a POST request with this JSON body:

\`\`\`json
{
  "url": "https://example.com/article",
  "title": "Article Title",
  "author": "John Doe",
  "published": "2024-01-15",
  "description": "Article summary...",
  "content": "# Markdown content...",
  "format": "markdown",
  "clippedAt": "2024-01-20T12:00:00.000Z"
}
\`\`\`

## How Defuddle works

Defuddle is a content extraction library created by the author of Obsidian. It:
- Finds the main content area using scoring algorithms
- Removes navigation, ads, sidebars, footers, comments
- Handles footnotes, code blocks, math equations
- Extracts metadata from schema.org, meta tags, etc.
- Converts cleaned HTML to Markdown

## Files

| File | Description |
|------|-------------|
| \`manifest.json\` | Extension manifest (v3) |
| \`popup.html\` | Popup UI |
| \`popup.js\` | Popup logic with Defuddle integration |
| \`background.js\` | Background service worker |
| \`defuddle.min.js\` | Defuddle library (download separately) |

## Troubleshooting

- If content extraction seems off, try using the \`contentSelector\` option
- Some SPAs may not work — Defuddle needs server-rendered HTML
- Check the browser console for errors (right-click extension → inspect)
`;

export default function InstallGuide() {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const downloadExtension = async () => {
    setDownloading(true);
    
    try {
      const zip = new JSZip();
      
      // Add manifest
      zip.file('manifest.json', MANIFEST_JSON);
      
      // Add background script
      zip.file('background.js', BACKGROUND_JS);
      
      // Add popup
      zip.file('popup.html', POPUP_HTML);
      zip.file('popup.js', POPUP_JS);
      
      // Add README
      zip.file('README.md', README_MD);
      
      // Add icons folder with placeholder
      const iconsFolder = zip.folder('icons');
      if (iconsFolder) {
        iconsFolder.file('README.txt', 'Replace these with actual PNG icons (16x16, 48x48, 128x128).\nYou can use any icon editor or online tool to create them.\n\nOr remove the icon references from manifest.json to use the default Chrome extension icon.');
      }

      // Add a download script for Defuddle
      zip.file('download-defuddle.sh', `#!/bin/bash
# Download Defuddle library for the extension
echo "Downloading Defuddle..."
curl -L "https://cdn.jsdelivr.net/npm/defuddle@0.19.4/dist/index.full.js" -o defuddle.min.js
echo "Done! File saved as defuddle.min.js"
`);

      zip.file('download-defuddle.ps1', `# Download Defuddle library for the extension
Write-Host "Downloading Defuddle..."
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/defuddle@0.19.4/dist/index.full.js" -OutFile "defuddle.min.js"
Write-Host "Done! File saved as defuddle.min.js"
`);
      
      // Generate and download ZIP
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, 'web-clipper-extension.zip');
      
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-5">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Install Extension
      </h2>

      {/* Download Button */}
      <button
        onClick={downloadExtension}
        disabled={downloading}
        className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 mb-4 ${
          downloaded
            ? 'bg-green-500 shadow-lg shadow-green-500/25'
            : downloading
            ? 'bg-slate-600 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg shadow-purple-500/25'
        }`}
      >
        {downloading ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Packaging...
          </>
        ) : downloaded ? (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Downloaded!
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Extension (.zip)
          </>
        )}
      </button>

      {/* Installation Steps */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-300">Installation Steps:</h3>
        
        <div className="flex gap-3 items-start">
          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs font-bold text-blue-400">1</span>
          </div>
          <p className="text-sm text-slate-300">Download & extract the ZIP file</p>
        </div>
        
        <div className="flex gap-3 items-start">
          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs font-bold text-blue-400">2</span>
          </div>
          <div className="text-sm text-slate-300">
            <p>Download Defuddle library into the folder:</p>
            <code className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded mt-1 inline-block">
              curl -L "https://cdn.jsdelivr.net/npm/defuddle@0.19.4/dist/index.full.js" -o defuddle.min.js
            </code>
            <p className="text-xs text-slate-500 mt-1">Or use the included download scripts</p>
          </div>
        </div>
        
        <div className="flex gap-3 items-start">
          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs font-bold text-blue-400">3</span>
          </div>
          <p className="text-sm text-slate-300">Open Chrome → <code className="text-purple-400 bg-purple-500/10 px-1 rounded">chrome://extensions/</code></p>
        </div>
        
        <div className="flex gap-3 items-start">
          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs font-bold text-blue-400">4</span>
          </div>
          <p className="text-sm text-slate-300">Enable <strong>"Developer mode"</strong> (top right toggle)</p>
        </div>
        
        <div className="flex gap-3 items-start">
          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs font-bold text-blue-400">5</span>
          </div>
          <p className="text-sm text-slate-300">Click <strong>"Load unpacked"</strong> → select extracted folder</p>
        </div>
        
        <div className="flex gap-3 items-start">
          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs font-bold text-green-400">✓</span>
          </div>
          <p className="text-sm text-slate-300">Extension icon appears — ready to clip!</p>
        </div>
      </div>

      {/* Defuddle Info */}
      <div className="mt-4 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
        <p className="text-xs text-purple-300 flex items-start gap-2">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span>
            <strong>Defuddle</strong> by kepano (creator of Obsidian) extracts the main content from web pages, 
            removing ads, navigation, sidebars, and comments. It also extracts metadata like author, 
            publish date, and description.
          </span>
        </p>
      </div>

      {/* API Format */}
      <div className="mt-3 bg-slate-900/50 rounded-lg p-3 border border-slate-600/30">
        <p className="text-xs font-medium text-slate-400 mb-2">API Request Format:</p>
        <pre className="text-[11px] text-slate-400 font-mono overflow-x-auto">
{`POST /api/clip
Content-Type: application/json

{
  "url": "https://...",
  "title": "Page Title",
  "author": "Author Name",
  "published": "2024-01-15",
  "description": "Article summary...",
  "content": "# Markdown...",
  "format": "markdown",
  "clippedAt": "2024-..."
}`}
        </pre>
      </div>
    </div>
  );
}
