import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function InstallGuide() {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const downloadExtension = async () => {
    setDownloading(true);
    
    try {
      const zip = new JSZip();
      
      // manifest.json
      const manifest = {
        manifest_version: 3,
        name: "Web Clipper",
        version: "1.0.0",
        description: "Clip web pages as Markdown",
        permissions: ["activeTab", "storage", "scripting"],
        action: {
          default_popup: "popup.html"
        },
        background: {
          service_worker: "background.js"
        }
      };
      zip.file('manifest.json', JSON.stringify(manifest, null, 2));
      
      // background.js
      const background = `chrome.runtime.onInstalled.addListener(() => {
  console.log('Web Clipper installed');
});`;
      zip.file('background.js', background);
      
      // popup.html
      const popupHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      width: 400px;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #1e293b;
      color: #e2e8f0;
      margin: 0;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    .header h1 {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }
    .icon {
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }
    .page-info {
      background: #334155;
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 12px;
    }
    .page-title {
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .page-url {
      font-size: 11px;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
    }
    .clip-btn {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 10px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      margin-bottom: 12px;
    }
    .clip-btn:hover { opacity: 0.9; }
    .clip-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .status {
      padding: 10px;
      border-radius: 8px;
      font-size: 12px;
      margin-bottom: 12px;
      display: none;
    }
    .status.success {
      display: block;
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.3);
      color: #4ade80;
    }
    .status.error {
      display: block;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
    }
    .preview {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 10px;
      max-height: 200px;
      overflow-y: auto;
      display: none;
    }
    .preview.show { display: block; }
    .preview pre {
      font-size: 11px;
      white-space: pre-wrap;
      color: #cbd5e1;
      font-family: 'SF Mono', monospace;
      line-height: 1.5;
      margin: 0;
    }
    .copy-btn {
      width: 100%;
      padding: 8px;
      border: 1px solid #475569;
      border-radius: 6px;
      background: transparent;
      color: #94a3b8;
      font-size: 12px;
      cursor: pointer;
      margin-top: 8px;
    }
    .copy-btn:hover { background: #334155; color: #e2e8f0; }
  </style>
</head>
<body>
  <div class="header">
    <div class="icon">📋</div>
    <h1>Web Clipper</h1>
  </div>
  <div class="page-info">
    <div class="page-title" id="page-title">Loading...</div>
    <div class="page-url" id="page-url">...</div>
  </div>
  <button class="clip-btn" id="clip-btn">📋 Clip This Page</button>
  <div class="status" id="status"></div>
  <div class="preview" id="preview">
    <pre id="markdown-output"></pre>
  </div>
  <button class="copy-btn" id="copy-btn" style="display:none">📋 Copy Markdown</button>
  <script src="popup.js"></script>
</body>
</html>`;
      zip.file('popup.html', popupHtml);
      
      // popup.js - ПРОСТАЯ ВЕРСИЯ
      const popupJs = `
// Ждем загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
  console.log('Popup loaded');
  
  // Получаем информацию о текущей вкладке
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs && tabs[0]) {
      const titleEl = document.getElementById('page-title');
      const urlEl = document.getElementById('page-url');
      if (titleEl) titleEl.textContent = tabs[0].title || 'Untitled';
      if (urlEl) urlEl.textContent = tabs[0].url || '';
    }
  });
  
  let currentMarkdown = '';
  
  // Кнопка клип
  const clipBtn = document.getElementById('clip-btn');
  if (clipBtn) {
    clipBtn.addEventListener('click', async function() {
      console.log('Clip button clicked');
      
      const btn = this;
      const status = document.getElementById('status');
      const preview = document.getElementById('preview');
      const copyBtn = document.getElementById('copy-btn');
      
      btn.disabled = true;
      btn.textContent = '⏳ Extracting...';
      
      try {
        // Получаем текущую вкладку
        const tabs = await chrome.tabs.query({active: true, currentWindow: true});
        const tab = tabs[0];
        
        // Внедряем скрипт для получения контента
        const results = await chrome.scripting.executeScript({
          target: {tabId: tab.id},
          function: () => {
            // Простое извлечение текста
            const title = document.title;
            const url = window.location.href;
            
            // Получаем основной контент
            let content = '';
            const article = document.querySelector('article') || 
                           document.querySelector('main') || 
                           document.querySelector('[role="main"]') ||
                           document.body;
            
            // Клонируем и очищаем
            const clone = article.cloneNode(true);
            
            // Удаляем ненужное
            clone.querySelectorAll('script, style, nav, footer, iframe, noscript, .ad, .ads, .sidebar, .comments, nav, .menu').forEach(el => el.remove());
            
            content = clone.textContent || clone.innerText || '';
            
            return {title, url, content: content.trim()};
          }
        });
        
        const data = results[0].result;
        
        // Создаем простой Markdown
        let markdown = '# ' + data.title + '\\n\\n';
        markdown += '> Source: ' + data.url + '\\n\\n';
        markdown += '> Clipped: ' + new Date().toLocaleString() + '\\n\\n---\\n\\n';
        markdown += data.content;
        
        currentMarkdown = markdown;
        
        // Показываем результат
        const output = document.getElementById('markdown-output');
        if (output) output.textContent = markdown;
        if (preview) preview.classList.add('show');
        if (copyBtn) copyBtn.style.display = 'block';
        
        if (status) {
          status.textContent = '✅ Clipped successfully!';
          status.className = 'status success';
        }
        
      } catch (err) {
        console.error('Error:', err);
        if (status) {
          status.textContent = '❌ Error: ' + err.message;
          status.className = 'status error';
        }
      }
      
      btn.disabled = false;
      btn.textContent = '📋 Clip This Page';
    });
  }
  
  // Кнопка копирования
  const copyBtn = document.getElementById('copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
      navigator.clipboard.writeText(currentMarkdown).then(() => {
        this.textContent = '✅ Copied!';
        setTimeout(() => {
          this.textContent = '📋 Copy Markdown';
        }, 2000);
      });
    });
  }
});
`;
      zip.file('popup.js', popupJs);
      
      // Generate ZIP
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
        ZIP-архив с расширением • Готово к установке
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
