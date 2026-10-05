// Get current tab info
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]) {
    document.getElementById('page-title').textContent = tabs[0].title || 'Untitled';
    document.getElementById('page-url').textContent = tabs[0].url || '';
  }
});

let currentMarkdown = '';

// Clip button
document.getElementById('clip-btn').addEventListener('click', async () => {
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
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        // Simple content extraction
        const title = document.title;
        const url = window.location.href;
        
        // Try to find main content
        const selectors = ['article', 'main', '[role="main"]', '.content', '.post', '.article'];
        let contentEl = null;
        
        for (const selector of selectors) {
          contentEl = document.querySelector(selector);
          if (contentEl && contentEl.textContent.length > 200) {
            break;
          }
        }
        
        if (!contentEl) {
          contentEl = document.body;
        }
        
        // Clone and clean
        const clone = contentEl.cloneNode(true);
        
        // Remove unwanted elements
        const removeSelectors = ['script', 'style', 'nav', 'footer', 'iframe', 'noscript', '.ad', '.ads', '.advertisement', '.sidebar', '.comments', '.comment', '.nav', '.navigation', '.menu'];
        removeSelectors.forEach(selector => {
          clone.querySelectorAll(selector).forEach(el => el.remove());
        });
        
        // Get text content
        const text = clone.textContent || clone.innerText || '';
        
        return {
          title: title,
          url: url,
          html: clone.innerHTML,
          text: text.trim()
        };
      }
    });

    const pageData = results[0].result;
    
    // Simple HTML to Markdown conversion
    let markdown = '';
    
    // Add title
    markdown += '# ' + pageData.title + '\n\n';
    
    // Add URL
    markdown += '> Source: [' + pageData.url + '](' + pageData.url + ')\n\n';
    
    // Add date
    markdown += '> Clipped: ' + new Date().toLocaleString() + '\n\n---\n\n';
    
    // Convert HTML to simple markdown
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = pageData.html;
    
    // Process headings
    tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
      const level = parseInt(heading.tagName[1]);
      const prefix = '#'.repeat(level);
      heading.innerHTML = prefix + ' ' + heading.textContent;
    });
    
    // Process links
    tempDiv.querySelectorAll('a').forEach(link => {
      const href = link.getAttribute('href');
      const text = link.textContent;
      if (href && text) {
        link.innerHTML = '[' + text + '](' + href + ')';
      }
    });
    
    // Process bold and italic
    tempDiv.querySelectorAll('strong, b').forEach(el => {
      el.innerHTML = '**' + el.textContent + '**';
    });
    tempDiv.querySelectorAll('em, i').forEach(el => {
      el.innerHTML = '*' + el.textContent + '*';
    });
    
    // Process lists
    tempDiv.querySelectorAll('ul').forEach(ul => {
      let listText = '';
      ul.querySelectorAll('li').forEach(li => {
        listText += '- ' + li.textContent.trim() + '\n';
      });
      ul.innerHTML = listText;
    });
    
    tempDiv.querySelectorAll('ol').forEach(ol => {
      let listText = '';
      let counter = 1;
      ol.querySelectorAll('li').forEach(li => {
        listText += counter + '. ' + li.textContent.trim() + '\n';
        counter++;
      });
      ol.innerHTML = listText;
    });
    
    // Process code blocks
    tempDiv.querySelectorAll('pre code').forEach(code => {
      code.innerHTML = '```\n' + code.textContent + '\n```';
    });
    
    // Process blockquotes
    tempDiv.querySelectorAll('blockquote').forEach(bq => {
      const lines = bq.textContent.split('\n');
      bq.innerHTML = lines.map(line => '> ' + line).join('\n');
    });
    
    // Get final text
    const content = tempDiv.textContent || tempDiv.innerText || '';
    
    // Clean up extra whitespace
    markdown += content
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
    
    currentMarkdown = markdown;
    
    // Show preview
    document.getElementById('markdown-output').textContent = markdown;
    preview.classList.add('show');
    copyBtn.style.display = 'block';
    
    status.textContent = '✅ Clipped successfully!';
    status.className = 'status success';
    
  } catch (err) {
    status.textContent = '❌ Error: ' + err.message;
    status.className = 'status error';
    console.error('Clip error:', err);
  }
  
  btn.disabled = false;
  btn.textContent = '📋 Clip This Page';
});

// Copy button
document.getElementById('copy-btn').addEventListener('click', () => {
  navigator.clipboard.writeText(currentMarkdown).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = '✅ Copied!';
    setTimeout(() => {
      btn.textContent = '📋 Copy Markdown';
    }, 2000);
  });
});
