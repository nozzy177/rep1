import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const MANIFEST_JSON = `{
  "manifest_version": 3,
  "name": "Web Clipper",
  "version": "1.0.0",
  "description": "Clip web pages and send them as Markdown to your API",
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

// Listen for clip requests from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'clipPage') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: getPageContent
        }).then((results) => {
          if (results && results[0]) {
            sendResponse({ success: true, data: results[0].result });
          }
        }).catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      }
    });
    return true; // Keep message channel open for async response
  }
});

function getPageContent() {
  // Remove unwanted elements
  const clone = document.cloneNode(true);
  const removeSelectors = ['script', 'style', 'nav', 'footer', 'iframe', 'noscript', 'svg'];
  removeSelectors.forEach(sel => {
    clone.querySelectorAll(sel).forEach(el => el.remove());
  });
  
  return {
    title: document.title,
    url: window.location.href,
    html: clone.querySelector('body').innerHTML,
    text: document.body.innerText
  };
}
`;

const POPUP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      width: 380px; 
      min-height: 300px; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #1e293b; 
      color: #e2e8f0; 
      padding: 16px; 
    }
    .header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    .header h1 { font-size: 16px; font-weight: 600; }
    .header .icon { width: 24px; height: 24px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 6px; display: flex; align-items: center; justify-content: center; }
    .page-info { background: #334155; border-radius: 8px; padding: 10px; margin-bottom: 12px; border: 1px solid #475569; }
    .page-info .title { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .page-info .url { font-size: 11px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
    .clip-btn { width: 100%; padding: 10px; border: none; border-radius: 8px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
    .clip-btn:hover { opacity: 0.9; }
    .clip-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .status { margin-top: 10px; padding: 8px; border-radius: 6px; font-size: 12px; display: none; }
    .status.success { display: block; background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); color: #4ade80; }
    .status.error { display: block; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #f87171; }
    .preview { margin-top: 12px; display: none; }
    .preview.visible { display: block; }
    .preview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .preview-header span { font-size: 11px; color: #94a3b8; }
    .copy-btn { font-size: 11px; color: #60a5fa; background: none; border: none; cursor: pointer; }
    .preview-content { background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 8px; max-height: 150px; overflow-y: auto; }
    .preview-content pre { font-size: 11px; white-space: pre-wrap; color: #cbd5e1; font-family: monospace; }
    .settings-link { display: block; text-align: center; margin-top: 12px; font-size: 11px; color: #94a3b8; text-decoration: none; }
    .settings-link:hover { color: #e2e8f0; }
    .settings-form { display: none; }
    .settings-form.visible { display: block; }
    .form-group { margin-bottom: 10px; }
    .form-group label { display: block; font-size: 12px; color: #94a3b8; margin-bottom: 4px; }
    .form-group input { width: 100%; padding: 8px; background: #334155; border: 1px solid #475569; border-radius: 6px; color: #e2e8f0; font-size: 12px; }
    .form-group input:focus { outline: none; border-color: #8b5cf6; }
    .save-btn { width: 100%; padding: 8px; border: none; border-radius: 6px; background: #22c55e; color: white; font-size: 13px; font-weight: 500; cursor: pointer; }
  </style>
</head>
<body>
  <div class="header">
    <div class="icon">📋</div>
    <h1>Web Clipper</h1>
  </div>

  <div id="main-view">
    <div class="page-info">
      <div class="title" id="page-title">Loading...</div>
      <div class="url" id="page-url">...</div>
    </div>

    <button class="clip-btn" id="clip-btn" onclick="clipPage()">📋 Clip This Page</button>
    
    <div class="status" id="status"></div>
    
    <div class="preview" id="preview">
      <div class="preview-header">
        <span>Markdown Preview</span>
        <button class="copy-btn" onclick="copyMarkdown()">📋 Copy</button>
      </div>
      <div class="preview-content">
        <pre id="markdown-output"></pre>
      </div>
    </div>

    <a href="#" class="settings-link" onclick="showSettings(event)">⚙️ Settings</a>
  </div>

  <div class="settings-form" id="settings-form">
    <div class="form-group">
      <label>API Endpoint URL</label>
      <input type="url" id="api-url" placeholder="https://your-api.com/api/clip">
    </div>
    <div class="form-group">
      <label>API Key (optional)</label>
      <input type="password" id="api-key" placeholder="Bearer token">
    </div>
    <button class="save-btn" onclick="saveSettings()">💾 Save Settings</button>
    <a href="#" class="settings-link" onclick="showMain(event)">← Back to Clipper</a>
  </div>

  <script src="turndown.min.js"></script>
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
  
  btn.disabled = true;
  btn.textContent = '⏳ Clipping...';
  status.className = 'status';
  status.style.display = 'none';

  try {
    // Get page content
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        const clone = document.cloneNode(true);
        ['script','style','nav','footer','iframe','noscript','svg'].forEach(sel => {
          clone.querySelectorAll(sel).forEach(el => el.remove());
        });
        return {
          title: document.title,
          url: window.location.href,
          html: clone.querySelector('body').innerHTML
        };
      }
    });

    const pageData = results[0].result;
    
    // Convert to Markdown
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-'
    });
    
    let markdown = '';
    
    const settings = (await chrome.storage.sync.get(['settings'])).settings || {};
    
    if (settings.includeTitle !== false) {
      markdown += '# ' + pageData.title + '\\n\\n';
    }
    if (settings.includeUrl !== false) {
      markdown += '> Source: [' + pageData.url + '](' + pageData.url + ')\\n\\n';
    }
    if (settings.includeDate !== false) {
      markdown += '> Clipped: ' + new Date().toLocaleString() + '\\n\\n---\\n\\n';
    }
    
    markdown += turndownService.turndown(pageData.html);
    currentMarkdown = markdown;
    
    // Show preview
    document.getElementById('markdown-output').textContent = markdown;
    document.getElementById('preview').classList.add('visible');
    
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
            title: pageData.title,
            content: markdown,
            format: 'markdown',
            clippedAt: new Date().toISOString()
          })
        });
        
        if (response.ok) {
          status.textContent = '✅ Clipped and sent successfully!';
          status.className = 'status success';
        } else {
          status.textContent = '✅ Clipped! (API returned ' + response.status + ')';
          status.className = 'status success';
        }
      } catch (err) {
        status.textContent = '✅ Clipped! (Could not reach API)';
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
  navigator.clipboard.writeText(currentMarkdown);
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
    alert('Settings saved!');
    showMain(new Event('click'));
  });
}
`;

const README_MD = `# Web Clipper Chrome Extension

## Installation

1. Download and extract the ZIP file
2. Open Chrome and go to \`chrome://extensions/\`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the extracted folder
6. The extension icon will appear in your toolbar

## Usage

1. Navigate to any web page
2. Click the Web Clipper extension icon
3. Click "Clip This Page"
4. The page content will be converted to Markdown
5. If an API URL is configured, it will be sent automatically

## Configuration

Click "Settings" in the popup to configure:
- **API Endpoint URL**: Where to send clipped content (POST request)
- **API Key**: Optional Bearer token for authentication

## API Format

The extension sends a POST request with this JSON body:

\`\`\`json
{
  "url": "https://example.com/page",
  "title": "Page Title",
  "content": "# Markdown content...",
  "format": "markdown",
  "clippedAt": "2024-01-01T12:00:00.000Z"
}
\`\`\`

## Files

- \`manifest.json\` - Extension manifest (v3)
- \`popup.html\` - Popup UI
- \`popup.js\` - Popup logic
- \`background.js\` - Background service worker
- \`turndown.min.js\` - HTML to Markdown converter
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
      
      // We'll add a note about icons since we can't generate PNGs in browser
      if (iconsFolder) {
        iconsFolder.file('README.txt', 'Replace these with actual PNG icons (16x16, 48x48, 128x128).\nYou can use any icon editor or online tool to create them.\n\nOr remove the icon references from manifest.json to use the default Chrome extension icon.');
      }
      
      // Download turndown from CDN (add a loader script instead)
      zip.file('turndown-loader.js', `// Load Turndown from CDN
const script = document.createElement('script');
script.src = 'https://unpkg.com/turndown@7.1.2/dist/turndown.js';
script.onload = () => {
  console.log('Turndown loaded');
};
document.head.appendChild(script);
`);

      // Update popup.html to use CDN turndown
      const updatedPopupHtml = POPUP_HTML.replace(
        '<script src="turndown.min.js"></script>',
        '<script src="https://unpkg.com/turndown@7.1.2/dist/turndown.js"></script>'
      );
      zip.file('popup.html', updatedPopupHtml);
      
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
          <p className="text-sm text-slate-300">Download and extract the ZIP file</p>
        </div>
        
        <div className="flex gap-3 items-start">
          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs font-bold text-blue-400">2</span>
          </div>
          <p className="text-sm text-slate-300">Open Chrome → <code className="text-purple-400 bg-purple-500/10 px-1 rounded">chrome://extensions/</code></p>
        </div>
        
        <div className="flex gap-3 items-start">
          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs font-bold text-blue-400">3</span>
          </div>
          <p className="text-sm text-slate-300">Enable <strong>"Developer mode"</strong> (top right toggle)</p>
        </div>
        
        <div className="flex gap-3 items-start">
          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs font-bold text-blue-400">4</span>
          </div>
          <p className="text-sm text-slate-300">Click <strong>"Load unpacked"</strong> → select extracted folder</p>
        </div>
        
        <div className="flex gap-3 items-start">
          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs font-bold text-green-400">✓</span>
          </div>
          <p className="text-sm text-slate-300">Extension icon appears in toolbar — ready to clip!</p>
        </div>
      </div>

      {/* Info */}
      <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
        <p className="text-xs text-blue-300 flex items-start gap-2">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            The extension uses <strong>Turndown.js</strong> (loaded from CDN) to convert HTML to Markdown. 
            Configure your API endpoint in the extension settings to auto-send clipped content.
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
  "content": "# Markdown...",
  "format": "markdown",
  "clippedAt": "2024-..."
}`}
        </pre>
      </div>
    </div>
  );
}
