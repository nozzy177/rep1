import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const MANIFEST_JSON = `{
  "manifest_version": 3,
  "name": "Web Clipper",
  "version": "1.1.0",
  "description": "Clip web pages and send them as Markdown to your API. Powered by Defuddle for intelligent content extraction.",
  "permissions": ["activeTab", "storage", "scripting"],
  "action": {
    "default_popup": "popup.html"
  },
  "background": {
    "service_worker": "background.js"
  }
}`;

const BACKGROUND_JS = `chrome.runtime.onInstalled.addListener(() => {
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
    .stats { margin-top: 12px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; display: none; }
    .stats.visible { display: grid; }
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
    .back-link { display: block; text-align: center; font-size: 11px; color: #94a3b8; text-decoration: none; padding: 6px; border-radius: 6px; }
    .back-link:hover { color: #e2e8f0; background: rgba(51,65,85,0.3); }
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

    <button class="clip-btn" id="clip-btn">📋 Clip This Page</button>
    
    <div class="status" id="status"></div>
    
    <div class="metadata" id="metadata">
      <div class="label">Extracted Metadata</div>
      <div id="metadata-content"></div>
    </div>
    
    <div class="preview" id="preview">
      <div class="preview-header">
        <span>📝 Markdown Output</span>
        <button class="copy-btn" id="copy-btn">📋 Copy</button>
      </div>
      <div class="preview-content">
        <pre id="markdown-output"></pre>
      </div>
    </div>

    <div class="stats" id="stats">
      <div class="stat"><div class="value" id="stat-chars">—</div><div class="label">Chars</div></div>
      <div class="stat"><div class="value" id="stat-words">—</div><div class="label">Words</div></div>
      <div class="stat"><div class="value" id="stat-time">—</div><div class="label">Parse</div></div>
      <div class="stat"><div class="value" id="stat-format">MD</div><div class="label">Format</div></div>
    </div>

    <a href="#" class="settings-link" id="settings-link">⚙️ Settings</a>
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
    <button class="save-btn" id="save-btn">💾 Save Settings</button>
    <a href="#" class="back-link" id="back-link">← Back to Clipper</a>
  </div>

  <script src="defuddle.min.js"></script>
  <script src="popup.js"></script>
</body>
</html>`;

const POPUP_JS = `// Helper function to safely add event listeners
function safeAddListener(id, event, handler) {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener(event, handler);
  } else {
    console.error('Element not found:', id);
  }
}

// Get current tab info
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]) {
    const titleEl = document.getElementById('page-title');
    const urlEl = document.getElementById('page-url');
    if (titleEl) titleEl.textContent = tabs[0].title || 'Untitled';
    if (urlEl) urlEl.textContent = tabs[0].url || '';
  }
});

// Load settings
chrome.storage.sync.get(['settings'], (result) => {
  if (result.settings) {
    const apiUrlEl = document.getElementById('api-url');
    const apiKeyEl = document.getElementById('api-key');
    if (apiUrlEl) apiUrlEl.value = result.settings.apiUrl || '';
    if (apiKeyEl) apiKeyEl.value = result.settings.apiKey || '';
  }
});

let currentMarkdown = '';

// Clip button
safeAddListener('clip-btn', 'click', clipPage);

// Copy button
safeAddListener('copy-btn', 'click', copyMarkdown);

// Settings link
safeAddListener('settings-link', 'click', (e) => {
  e.preventDefault();
  const mainView = document.getElementById('main-view');
  const settingsForm = document.getElementById('settings-form');
  if (mainView) mainView.style.display = 'none';
  if (settingsForm) settingsForm.classList.add('visible');
});

// Back link
safeAddListener('back-link', 'click', (e) => {
  e.preventDefault();
  const mainView = document.getElementById('main-view');
  const settingsForm = document.getElementById('settings-form');
  if (mainView) mainView.style.display = 'block';
  if (settingsForm) settingsForm.classList.remove('visible');
});

// Save button
safeAddListener('save-btn', 'click', saveSettings);

async function clipPage() {
  const btn = document.getElementById('clip-btn');
  const status = document.getElementById('status');
  const metadata = document.getElementById('metadata');
  const preview = document.getElementById('preview');
  const stats = document.getElementById('stats');
  
  if (!btn || !status) {
    console.error('Required elements not found');
    return;
  }
  
  btn.disabled = true;
  btn.textContent = '⏳ Extracting content...';
  status.className = 'status';
  status.style.display = 'none';
  if (metadata) metadata.classList.remove('visible');
  if (preview) preview.classList.remove('visible');
  if (stats) stats.classList.remove('visible');

  try {
    // Check if Defuddle is loaded
    if (typeof Defuddle === 'undefined') {
      throw new Error('Defuddle library not loaded. Please check if defuddle.min.js exists.');
    }
    
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
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(pageData.html, 'text/html');
    
    const defuddle = new Defuddle(doc, {
      url: pageData.url,
      markdown: true,
      removeHiddenElements: true,
      removeLowScoring: true,
      removeSmallImages: true,
      standardize: true,
    });
    
    const result = defuddle.parse();
    
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
    
    markdown += result.content || '';
    currentMarkdown = markdown;
    
    const metadataContent = document.getElementById('metadata-content');
    let metaHtml = '';
    if (result.title) metaHtml += '<div class="item"><span>Title:</span> ' + result.title + '</div>';
    if (result.author) metaHtml += '<div class="item"><span>Author:</span> ' + result.author + '</div>';
    if (result.published) metaHtml += '<div class="item"><span>Published:</span> ' + result.published + '</div>';
    if (result.description) metaHtml += '<div class="item"><span>Desc:</span> ' + result.description.substring(0, 100) + '...</div>';
    if (result.wordCount) metaHtml += '<div class="item"><span>Words:</span> ' + result.wordCount + '</div>';
    if (metadataContent) metadataContent.innerHTML = metaHtml;
    if (metadata) metadata.classList.add('visible');
    
    const markdownOutput = document.getElementById('markdown-output');
    if (markdownOutput) markdownOutput.textContent = markdown;
    if (preview) preview.classList.add('visible');
    
    const statChars = document.getElementById('stat-chars');
    const statWords = document.getElementById('stat-words');
    const statTime = document.getElementById('stat-time');
    if (statChars) statChars.textContent = markdown.length;
    if (statWords) statWords.textContent = result.wordCount || markdown.split(/\\s+/).filter(Boolean).length;
    if (statTime) statTime.textContent = result.parseTime ? result.parseTime + 'ms' : '—';
    if (stats) stats.classList.add('visible');
    
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
    const btn = document.getElementById('copy-btn');
    if (btn) {
      btn.textContent = '✅ Copied!';
      setTimeout(() => { btn.textContent = '📋 Copy'; }, 2000);
    }
  });
}

function saveSettings() {
  const apiUrlEl = document.getElementById('api-url');
  const apiKeyEl = document.getElementById('api-key');
  
  const settings = {
    apiUrl: apiUrlEl ? apiUrlEl.value : '',
    apiKey: apiKeyEl ? apiKeyEl.value : '',
    includeUrl: true,
    includeTitle: true,
    includeDate: true,
    format: 'markdown'
  };
  
  chrome.storage.sync.set({ settings }, () => {
    const btn = document.getElementById('save-btn');
    const mainView = document.getElementById('main-view');
    const settingsForm = document.getElementById('settings-form');
    
    if (btn) {
      btn.textContent = '✅ Saved!';
      setTimeout(() => {
        btn.textContent = '💾 Save Settings';
        if (mainView) mainView.style.display = 'block';
        if (settingsForm) settingsForm.classList.remove('visible');
      }, 1000);
    }
  });
}
`;

const README_MD = `# Web Clipper — Chrome Extension

> 🧠 Powered by [Defuddle](https://github.com/kepano/defuddle) — интеллектуальное извлечение контента

## Что это?

Расширение для Chrome, которое извлекает **основной контент** с любой веб-страницы
(удаляя навигацию, рекламу, сайдбары, комментарии и т.д.) и конвертирует его в чистый Markdown.
Результат отправляется на ваш API-эндпоинт.

## Возможности

- 🧠 **Умное извлечение контента** через Defuddle — автоматически убирает мусор
- 📝 **Чистый Markdown** с правильным форматированием
- 📊 **Извлечение метаданных** — заголовок, автор, дата публикации, описание
- 🔗 **Интеграция с API** — отправка клипнутого контента на любой эндпоинт
- 🔑 **Аутентификация** — поддержка Bearer-токена
- ⚡ **Быстро** — извлечение контента происходит локально в браузере

## Установка

1. Распакуйте этот ZIP-файл в любую папку
2. Откройте Chrome → \`chrome://extensions/\`
3. Включите **"Режим разработчика"** (переключатель справа вверху)
4. Нажмите **"Загрузить распакованное расширение"**
5. Выберите папку с распакованными файлами
6. Готово! Иконка 📋 появится в панели Chrome

> 💡 **Совет:** закрепите расширение — нажмите на иконку пазла 🧩 в Chrome
> и нажмите 📌 рядом с "Web Clipper".

## Использование

1. Откройте любую веб-страницу
2. Нажмите на иконку расширения Web Clipper
3. Нажмите **"Clip This Page"**
4. Defuddle извлечёт основной контент и конвертирует в Markdown
5. Проверьте метаданные и превью
6. Если настроен API URL — контент отправится автоматически

## Настройка

Нажмите **"Settings"** в popup-окне расширения:
- **API Endpoint URL** — куда отправлять контент (POST-запрос)
- **API Key** — опциональный Bearer-токен для аутентификации

## Формат API-запроса

Расширение отправляет POST-запрос с JSON-телом:

\`\`\`json
{
  "url": "https://example.com/article",
  "title": "Заголовок статьи",
  "author": "Имя автора",
  "published": "2024-01-15",
  "description": "Краткое описание...",
  "content": "# Markdown контент...",
  "format": "markdown",
  "clippedAt": "2024-01-20T12:00:00.000Z"
}
\`\`\`

## Как работает Defuddle

Defuddle — библиотека извлечения контента от создателя Obsidian:
- Находит основную область контента с помощью алгоритма скоринга
- Удаляет навигацию, рекламу, сайдбары, футеры, комментарии
- Обрабатывает сноски, блоки кода, математические формулы
- Извлекает метаданные из schema.org, meta-тегов и т.д.
- Конвертирует очищенный HTML в Markdown

## Файлы

| Файл | Описание |
|------|----------|
| \`manifest.json\` | Манифест расширения (v3) |
| \`popup.html\` | Интерфейс popup-окна |
| \`popup.js\` | Логика popup с интеграцией Defuddle |
| \`background.js\` | Фоновый service worker |
| \`defuddle.min.js\` | Библиотека Defuddle (уже включена!) |

## Устранение неполадок

- Если извлечение контента работает некорректно — попробуйте опцию \`contentSelector\`
- Некоторые SPA могут не работать — Defuddle нужен server-rendered HTML
- Проверьте консоль браузера на ошибки (правый клик на расширении → inspect)
- Если Defuddle не загрузился — скачайте вручную:
  https://cdn.jsdelivr.net/npm/defuddle@0.19.4/dist/index.full.js
  и сохраните как \`defuddle.min.js\` в папку расширения
`;

export default function InstallGuide() {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const downloadExtension = async () => {
    setDownloading(true);
    
    try {
      const zip = new JSZip();
      
      zip.file('manifest.json', MANIFEST_JSON);
      zip.file('background.js', BACKGROUND_JS);
      zip.file('popup.html', POPUP_HTML);
      zip.file('popup.js', POPUP_JS);
      zip.file('README.md', README_MD);

      // Download Defuddle library from CDN
      try {
        const defuddleResponse = await fetch('https://cdn.jsdelivr.net/npm/defuddle@0.19.4/dist/index.full.js');
        if (defuddleResponse.ok) {
          const defuddleCode = await defuddleResponse.text();
          zip.file('defuddle.min.js', defuddleCode);
        } else {
          throw new Error('Failed to fetch Defuddle');
        }
      } catch (fetchErr) {
        zip.file('defuddle.min.js', 
          '// ERROR: Could not download Defuddle from CDN.\n' +
          '// Please download manually from:\n' +
          '// https://cdn.jsdelivr.net/npm/defuddle@0.19.4/dist/index.full.js\n' +
          '// and save it as defuddle.min.js in this folder.\n'
        );
        console.warn('Could not download Defuddle from CDN:', fetchErr);
      }
      
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
      {/* Big Download Button */}
      <button
        onClick={downloadExtension}
        disabled={downloading}
        className={`w-full py-4 px-6 rounded-2xl font-bold text-white text-lg transition-all duration-200 flex items-center justify-center gap-3 mb-3 ${
          downloaded
            ? 'bg-green-500 shadow-lg shadow-green-500/30 scale-[1.02]'
            : downloading
            ? 'bg-slate-600 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] active:scale-[0.98]'
        }`}
      >
        {downloading ? (
          <>
            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Скачиваю...
          </>
        ) : downloaded ? (
          <>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Скачано! ✓
          </>
        ) : (
          <>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            ⬇ Скачать расширение
          </>
        )}
      </button>
      
      <p className="text-xs text-slate-400 text-center mb-5">
        ZIP-архив с расширением • Defuddle уже внутри
      </p>

      {/* Installation Steps */}
      <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <span className="text-base">📖</span> Как установить (3 шага):
        </h3>
        
        <div className="space-y-3">
          <div className="flex gap-3 items-start">
            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
              <span className="text-xs font-bold text-white">1</span>
            </div>
            <div className="pt-0.5">
              <p className="text-sm text-white font-medium">Распакуйте ZIP</p>
              <p className="text-xs text-slate-400 mt-0.5">Скачайте файл выше и распакуйте в любую папку</p>
            </div>
          </div>
          
          <div className="flex gap-3 items-start">
            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
              <span className="text-xs font-bold text-white">2</span>
            </div>
            <div className="pt-0.5">
              <p className="text-sm text-white font-medium">Откройте chrome://extensions/</p>
              <p className="text-xs text-slate-400 mt-0.5">Вставьте эту ссылку в адресную строку Chrome</p>
              <p className="text-xs text-slate-400">Включите переключатель <strong className="text-white">"Режим разработчика"</strong> справа вверху</p>
            </div>
          </div>
          
          <div className="flex gap-3 items-start">
            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
              <span className="text-xs font-bold text-white">3</span>
            </div>
            <div className="pt-0.5">
              <p className="text-sm text-white font-medium">"Загрузить распакованное расширение"</p>
              <p className="text-xs text-slate-400 mt-0.5">Нажмите эту кнопку и выберите папку из шага 1</p>
            </div>
          </div>
        </div>

        {/* Success indicator */}
        <div className="mt-4 pt-3 border-t border-slate-700/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-500/30">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-white font-medium">Готово! Иконка 📋 появится в Chrome</p>
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
        <p className="text-xs text-amber-200 flex items-start gap-2">
          <span className="text-sm">💡</span>
          <span>
            <strong>Закрепите расширение:</strong> нажмите иконку 🧩 (пазл) в правом верхнем углу Chrome → найдите "Web Clipper" → нажмите 📌 (булавка)
          </span>
        </p>
      </div>
    </div>
  );
}
