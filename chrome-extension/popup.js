console.log('=== popup.js LOADED ===');
console.log('Document readyState:', document.readyState);
console.log('Available elements:');
console.log('- clip-btn:', document.getElementById('clip-btn'));
console.log('- copy-btn:', document.getElementById('copy-btn'));
console.log('- save-settings-btn:', document.getElementById('save-settings-btn'));
console.log('- page-title:', document.getElementById('page-title'));
console.log('- page-url:', document.getElementById('page-url'));

// Переключение вкладок
console.log('Setting up tab listeners...');
document.querySelectorAll('.tab').forEach(tab => {
  console.log('Found tab:', tab.dataset.tab);
  tab.addEventListener('click', () => {
    console.log('Tab clicked:', tab.dataset.tab);
    const tabName = tab.dataset.tab;
    
    // Убираем active у всех вкладок
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    // Добавляем active к выбранной вкладке
    tab.classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
    console.log('Tab switched to:', tabName);
  });
});
console.log('Tab listeners set up');

// Загрузка информации о текущей странице
console.log('Querying current tab...');
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
  console.log('Got tabs:', tabs);
  if (tabs && tabs[0]) {
    console.log('Setting page title:', tabs[0].title);
    console.log('Setting page URL:', tabs[0].url);
    document.getElementById('page-title').textContent = tabs[0].title || 'Untitled';
    document.getElementById('page-url').textContent = tabs[0].url || '';
    console.log('Page info set successfully');
  } else {
    console.error('No tabs found!');
  }
});

// Загрузка настроек
console.log('Loading settings from storage...');
chrome.storage.sync.get(['settings'], (result) => {
  console.log('Settings from storage:', result);
  if (result.settings) {
    console.log('Applying settings to form...');
    document.getElementById('api-url').value = result.settings.apiUrl || '';
    document.getElementById('api-key').value = result.settings.apiKey || '';
    document.getElementById('include-title').checked = result.settings.includeTitle !== false;
    document.getElementById('include-url').checked = result.settings.includeUrl !== false;
    document.getElementById('include-date').checked = result.settings.includeDate !== false;
    console.log('Settings applied to form');
  } else {
    console.log('No settings found in storage');
  }
});

let currentMarkdown = '';

// Кнопка клипа
console.log('Setting up clip button...');
const clipBtn = document.getElementById('clip-btn');
console.log('Clip button element:', clipBtn);

clipBtn.onclick = async function() {
  console.log('=== CLIP BUTTON CLICKED ===');
  alert('Кнопка нажата! Начинаем извлечение...');
  
  const btn = this;
  const status = document.getElementById('status');
  const preview = document.getElementById('markdown-preview');
  const copyBtn = document.getElementById('copy-btn');
  
  console.log('Disabling button and showing loading...');
  btn.disabled = true;
  btn.textContent = '⏳ Extracting...';
  status.classList.remove('show');
  preview.classList.remove('show');
  copyBtn.style.display = 'none';
  
  try {
    console.log('Querying tabs...');
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    console.log('Got tabs for clipping:', tabs);
    const tab = tabs[0];
    console.log('Active tab:', tab);
    
    console.log('Executing script in page...');
    const results = await chrome.scripting.executeScript({
      target: {tabId: tab.id},
      function: () => {
        console.log('Script executing in page context');
        const title = document.title;
        const url = window.location.href;
        
        // Ищем основной контент
        const article = document.querySelector('article') || 
                       document.querySelector('main') || 
                       document.querySelector('[role="main"]') ||
                       document.body;
        
        console.log('Found content element:', article.tagName);
        const clone = article.cloneNode(true);
        
        // Удаляем ненужные элементы
        clone.querySelectorAll('script, style, nav, footer, iframe, noscript, .ad, .ads, .sidebar, .comments, .menu').forEach(el => el.remove());
        
        const content = (clone.textContent || '').trim();
        console.log('Extracted content length:', content.length);
        
        return {
          title,
          url,
          content
        };
      }
    });
    
    console.log('Script execution results:', results);
    const data = results[0].result;
    console.log('Extracted data:', data);
    
    // Получаем настройки
    console.log('Loading settings...');
    const settingsResult = await chrome.storage.sync.get(['settings']);
    const settings = settingsResult.settings || {};
    console.log('Settings loaded:', settings);
    
    // Создаем Markdown
    console.log('Creating Markdown...');
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
    console.log('Markdown created, length:', markdown.length);
    
    // Показываем превью
    console.log('Showing preview...');
    document.getElementById('markdown-preview').textContent = markdown;
    preview.classList.add('show');
    copyBtn.style.display = 'block';
    
    console.log('Showing success status...');
    status.textContent = '✅ Clipped successfully!';
    status.className = 'status success show';
    
    // Отправляем на API если настроено
    if (settings.apiUrl) {
      console.log('Sending to API:', settings.apiUrl);
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
        
        console.log('API response:', response.status);
        if (response.ok) {
          status.textContent = '✅ Sent to API successfully!';
        } else {
          status.textContent = '✅ Clipped! (API error: ' + response.status + ')';
        }
      } catch (err) {
        console.error('API error:', err);
        status.textContent = '✅ Clipped! (API not reachable)';
      }
    } else {
      console.log('No API URL configured, skipping API call');
    }
    
    console.log('=== CLIPPING COMPLETED SUCCESSFULLY ===');
    
  } catch (err) {
    console.error('=== ERROR DURING CLIPPING ===', err);
    alert('Ошибка: ' + err.message);
    status.textContent = '❌ Error: ' + err.message;
    status.className = 'status error show';
  }
  
  console.log('Re-enabling button...');
  btn.disabled = false;
  btn.textContent = '📋 Clip This Page';
  console.log('=== CLIP BUTTON HANDLER FINISHED ===');
};
console.log('Clip button handler set');

// Кнопка копирования
console.log('Setting up copy button...');
const copyBtn = document.getElementById('copy-btn');
console.log('Copy button element:', copyBtn);

copyBtn.onclick = function() {
  console.log('=== COPY BUTTON CLICKED ===');
  console.log('Copying markdown, length:', currentMarkdown.length);
  navigator.clipboard.writeText(currentMarkdown).then(() => {
    console.log('Markdown copied to clipboard');
    this.textContent = '✅ Copied!';
    setTimeout(() => {
      this.textContent = '📋 Copy Markdown';
    }, 2000);
  }).catch(err => {
    console.error('Copy error:', err);
    alert('Ошибка копирования: ' + err.message);
  });
};
console.log('Copy button handler set');

// Кнопка сохранения настроек
console.log('Setting up save settings button...');
const saveSettingsBtn = document.getElementById('save-settings-btn');
console.log('Save settings button element:', saveSettingsBtn);

saveSettingsBtn.onclick = function() {
  console.log('=== SAVE SETTINGS BUTTON CLICKED ===');
  const settings = {
    apiUrl: document.getElementById('api-url').value,
    apiKey: document.getElementById('api-key').value,
    includeTitle: document.getElementById('include-title').checked,
    includeUrl: document.getElementById('include-url').checked,
    includeDate: document.getElementById('include-date').checked
  };
  console.log('Settings to save:', settings);
  
  chrome.storage.sync.set({settings: settings}, () => {
    console.log('Settings saved successfully');
    this.textContent = '✅ Saved!';
    setTimeout(() => {
      this.textContent = '💾 Save Settings';
    }, 2000);
  });
};
console.log('Save settings button handler set');

console.log('=== ALL HANDLERS SET SUCCESSFULLY ===');
