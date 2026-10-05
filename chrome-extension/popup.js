console.log('=== popup.js LOADED ===');

// Показываем информацию о странице сразу
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  console.log('Got tabs:', tabs);
  if (tabs && tabs[0]) {
    document.getElementById('page-title').textContent = tabs[0].title || 'Untitled';
    document.getElementById('page-url').textContent = tabs[0].url || '';
    console.log('Set page info');
  }
});

let currentMarkdown = '';

// Кнопка клип - ИЗВЛЕКАЕМ HTML В СТРАНИЦЕ, ПОТОМ ОБРАБАТЫВАЕМ В POPUP
document.getElementById('clip-btn').onclick = async function() {
  console.log('=== CLIP BUTTON CLICKED ===');
  
  const btn = this;
  const status = document.getElementById('status');
  const preview = document.getElementById('preview');
  const copyBtn = document.getElementById('copy-btn');
  
  btn.disabled = true;
  btn.textContent = '⏳ Extracting HTML...';
  
  try {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    const tab = tabs[0];
    
    // Проверяем что это обычная веб-страница
    const url = tab.url || '';
    if (url.startsWith('chrome://') || 
        url.startsWith('chrome-extension://') || 
        url.startsWith('about:') || 
        url.startsWith('edge://') ||
        url.startsWith('devtools://')) {
      throw new Error('Нельзя клипать системные страницы Chrome. Откройте обычную веб-страницу (https://...).');
    }
    
    console.log('Extracting HTML from page...');
    
    // Извлекаем полный HTML из страницы
    const results = await chrome.scripting.executeScript({
      target: {tabId: tab.id},
      func: () => {
        return {
          title: document.title,
          url: window.location.href,
          html: document.documentElement.outerHTML
        };
      }
    });
    
    const data = results[0].result;
    console.log('HTML extracted, processing with Defuddle...');
    
    btn.textContent = '⏳ Processing with Defuddle...';
    
    // Создаем Document из HTML для Defuddle
    const parser = new DOMParser();
    const doc = parser.parseFromString(data.html, 'text/html');
    
    // Используем Defuddle для обработки
    const defuddle = new Defuddle(doc);
    const result = defuddle.parse();
    
    console.log('Defuddle processed:', result);
    
    // Создаем Markdown с метаданными
    let markdown = '# ' + (result.title || data.title) + '\n\n';
    
    if (result.author) {
      markdown += '> Author: ' + result.author + '\n';
    }
    
    markdown += '> Source: ' + data.url + '\n';
    markdown += '> Clipped: ' + new Date().toLocaleString() + '\n\n';
    
    if (result.description) {
      markdown += '## Summary\n\n' + result.description + '\n\n';
    }
    
    markdown += '---\n\n';
    markdown += result.content;
    
    currentMarkdown = markdown;
    
    document.getElementById('markdown-output').textContent = markdown;
    preview.classList.add('show');
    copyBtn.style.display = 'block';
    
    status.textContent = '✅ Clipped! (' + (result.wordCount || 0) + ' words, ' + (result.parseTime || 0) + 'ms)';
    status.className = 'status success';
    
  } catch (err) {
    console.error('Error:', err);
    status.textContent = '❌ ' + err.message;
    status.className = 'status error';
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

console.log('All handlers set');
