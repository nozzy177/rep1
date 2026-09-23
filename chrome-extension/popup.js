console.log('popup.js loaded');

// Переключение вкладок
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    
    // Убираем active у всех вкладок
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    // Добавляем active к выбранной вкладке
    tab.classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
  });
});

// Загрузка информации о текущей странице
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
  console.log('Got tabs:', tabs);
  if (tabs && tabs[0]) {
    document.getElementById('page-title').textContent = tabs[0].title || 'Untitled';
    document.getElementById('page-url').textContent = tabs[0].url || '';
    console.log('Set page info');
  }
});

// Загрузка настроек
chrome.storage.sync.get(['settings'], (result) => {
  if (result.settings) {
    document.getElementById('api-url').value = result.settings.apiUrl || '';
    document.getElementById('api-key').value = result.settings.apiKey || '';
    document.getElementById('include-title').checked = result.settings.includeTitle !== false;
    document.getElementById('include-url').checked = result.settings.includeUrl !== false;
    document.getElementById('include-date').checked = result.settings.includeDate !== false;
  }
});

let currentMarkdown = '';

// Кнопка клипа
document.getElementById('clip-btn').onclick = async function() {
  console.log('Clip button clicked');
  
  const btn = this;
  const status = document.getElementById('status');
  const preview = document.getElementById('markdown-preview');
  const copyBtn = document.getElementById('copy-btn');
  
  btn.disabled = true;
  btn.textContent = '⏳ Extracting...';
  status.classList.remove('show');
  preview.classList.remove('show');
  copyBtn.style.display = 'none';
  
  try {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    const tab = tabs[0];
    
    const results = await chrome.scripting.executeScript({
      target: {tabId: tab.id},
      function: () => {
        const title = document.title;
        const url = window.location.href;
        
        // Ищем основной контент
        const article = document.querySelector('article') || 
                       document.querySelector('main') || 
                       document.querySelector('[role="main"]') ||
                       document.body;
        
        const clone = article.cloneNode(true);
        
        // Удаляем ненужные элементы
        clone.querySelectorAll('script, style, nav, footer, iframe, noscript, .ad, .ads, .sidebar, .comments, .menu').forEach(el => el.remove());
        
        return {
          title,
          url,
          content: (clone.textContent || '').trim()
        };
      }
    });
    
    const data = results[0].result;
    
    // Получаем настройки
    const settingsResult = await chrome.storage.sync.get(['settings']);
    const settings = settingsResult.settings || {};
    
    // Создаем Markdown
    let markdown = '';
    
    if (settings.includeTitle !== false) {
      markdown += '# ' + data.title + '\n\n';
    }
    
    if (settings.includeUrl !== false) {
      markdown += '> Source: ' + data.url + '\n\n';
    }
    
    if (settings.includeDate !== false) {
      markdown += '> Clipped: ' + new Date().toLocaleString() + '\n\n';
    }
    
    markdown += '---\n\n';
    markdown += data.content;
    
    currentMarkdown = markdown;
    
    // Показываем превью
    document.getElementById('markdown-preview').textContent = markdown;
    preview.classList.add('show');
    copyBtn.style.display = 'block';
    
    status.textContent = '✅ Clipped successfully!';
    status.className = 'status success show';
    
    // Отправляем на API если настроено
    if (settings.apiUrl) {
      try {
        const headers = {'Content-Type': 'application/json'};
        if (settings.apiKey) {
          headers['Authorization'] = 'Bearer ' + settings.apiKey;
        }
        
        const response = await fetch(settings.apiUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            url: data.url,
            title: data.title,
            content: markdown,
            format: 'markdown',
            clippedAt: new Date().toISOString()
          })
        });
        
        if (response.ok) {
          status.textContent = '✅ Sent to API successfully!';
        } else {
          status.textContent = '✅ Clipped! (API error: ' + response.status + ')';
        }
      } catch (err) {
        console.error('API error:', err);
        status.textContent = '✅ Clipped! (API not reachable)';
      }
    }
    
  } catch (err) {
    console.error('Error:', err);
    status.textContent = '❌ Error: ' + err.message;
    status.className = 'status error show';
  }
  
  btn.disabled = false;
  btn.textContent = '📋 Clip This Page';
};

// Кнопка копирования
document.getElementById('copy-btn').onclick = function() {
  navigator.clipboard.writeText(currentMarkdown).then(() => {
    this.textContent = '✅ Copied!';
    setTimeout(() => {
      this.textContent = '📋 Copy Markdown';
    }, 2000);
  });
};

// Кнопка сохранения настроек
document.getElementById('save-settings-btn').onclick = function() {
  const settings = {
    apiUrl: document.getElementById('api-url').value,
    apiKey: document.getElementById('api-key').value,
    includeTitle: document.getElementById('include-title').checked,
    includeUrl: document.getElementById('include-url').checked,
    includeDate: document.getElementById('include-date').checked
  };
  
  chrome.storage.sync.set({settings: settings}, () => {
    this.textContent = '✅ Saved!';
    setTimeout(() => {
      this.textContent = '💾 Save Settings';
    }, 2000);
  });
};

console.log('All handlers set');
