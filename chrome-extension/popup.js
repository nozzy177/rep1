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

// Кнопка клип - С DEFUDLE
document.getElementById('clip-btn').onclick = async function() {
  console.log('=== CLIP BUTTON CLICKED ===');
  
  const btn = this;
  const status = document.getElementById('status');
  const preview = document.getElementById('preview');
  const copyBtn = document.getElementById('copy-btn');
  
  btn.disabled = true;
  btn.textContent = '⏳ Extracting with Defuddle...';
  
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
    
    console.log('Executing Defuddle in page...');
    const results = await chrome.scripting.executeScript({
      target: {tabId: tab.id},
      func: () => {
        // Используем Defuddle для извлечения контента
        const defuddle = new Defuddle(document);
        const result = defuddle.parse();
        
        return {
          title: result.title || document.title,
          url: window.location.href,
          content: result.content,
          author: result.author,
          published: result.published,
          description: result.description,
          wordCount: result.wordCount,
          parseTime: result.parseTime
        };
      }
    });
    
    const data = results[0].result;
    console.log('Extracted ', data);
    
    // Создаем Markdown с метаданными
    let markdown = '# ' + data.title + '\n\n';
    
    if (data.author) {
      markdown += '> Author: ' + data.author + '\n';
    }
    
    markdown += '> Source: ' + data.url + '\n';
    markdown += '> Clipped: ' + new Date().toLocaleString() + '\n\n';
    
    if (data.description) {
      markdown += '## Summary\n\n' + data.description + '\n\n';
    }
    
    markdown += '---\n\n';
    markdown += data.content;
    
    currentMarkdown = markdown;
    
    document.getElementById('markdown-output').textContent = markdown;
    preview.classList.add('show');
    copyBtn.style.display = 'block';
    
    status.textContent = '✅ Clipped! (' + (data.wordCount || 0) + ' words, ' + (data.parseTime || 0) + 'ms)';
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
