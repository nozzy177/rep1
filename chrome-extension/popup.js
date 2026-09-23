console.log('=== popup.js LOADED ===');

// Получаем информацию о текущей вкладке
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
  console.log('Got tabs:', tabs);
  if (tabs && tabs[0]) {
    document.getElementById('page-title').textContent = tabs[0].title || 'Untitled';
    document.getElementById('page-url').textContent = tabs[0].url || '';
    console.log('Set page info');
  }
});

let currentMarkdown = '';

// Кнопка клипа
document.getElementById('clip-btn').addEventListener('click', async () => {
  console.log('=== CLIP BUTTON CLICKED ===');
  
  const btn = document.getElementById('clip-btn');
  const status = document.getElementById('status');
  const preview = document.getElementById('preview');
  const copyBtn = document.getElementById('copy-btn');
  
  btn.disabled = true;
  btn.textContent = '⏳ Extracting...';
  status.className = 'status';
  status.style.display = 'none';
  preview.classList.remove('show');
  copyBtn.style.display = 'none';

  try {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    
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
    
    // Создаем простой Markdown
    let markdown = '# ' + data.title + '\n\n';
    markdown += '> Source: ' + data.url + '\n\n';
    markdown += '> Clipped: ' + new Date().toLocaleString() + '\n\n---\n\n';
    markdown += data.content;
    
    currentMarkdown = markdown;
    
    // Показываем превью
    document.getElementById('markdown-output').textContent = markdown;
    preview.classList.add('show');
    copyBtn.style.display = 'block';
    
    status.textContent = '✅ Clipped successfully!';
    status.className = 'status success';
    
  } catch (err) {
    console.error('Error:', err);
    status.textContent = '❌ Error: ' + err.message;
    status.className = 'status error';
  }
  
  btn.disabled = false;
  btn.textContent = '📋 Clip This Page';
});

// Кнопка копирования
document.getElementById('copy-btn').addEventListener('click', () => {
  navigator.clipboard.writeText(currentMarkdown).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = '✅ Copied!';
    setTimeout(() => {
      btn.textContent = '📋 Copy Markdown';
    }, 2000);
  });
});

console.log('All handlers set');
