// Background service worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('Web Clipper extension installed');
  
  // Initialize default settings
  chrome.storage.sync.get(['settings'], (result) => {
    if (!result.settings) {
      chrome.storage.sync.set({
        settings: {
          apiUrl: '',
          apiKey: '',
          includeTitle: true,
          includeUrl: true,
          includeDate: true
        }
      });
    }
  });
});
