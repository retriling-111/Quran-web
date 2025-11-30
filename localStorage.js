const LS_PREFIX = 'QURAN_APP_';

          function loadFromLocalStorage(key) {
               try {
                    const item = localStorage.getItem(LS_PREFIX + key);
                    return item ? JSON.parse(item) : null;
               } catch (e) {
                    console.error("Error loading state from localStorage:", e);
                    return null;
               }
          }

          function saveToLocalStorage(key, value) {
               try {
                    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
               } catch (e) {
                    console.error("Error saving state to localStorage:", e);
               }
          }

          function loadSettings() {
               const settings = loadFromLocalStorage('settings') || {};
               return {
                    theme: settings.theme || 'light',
                    color: settings.color || '#10b981',
                    reciterId: settings.reciterId || 1,
               };
          }

          function saveSettings(settings) {
               saveToLocalStorage('settings', settings);
          }

          function loadTasbeehHistory() {
               return loadFromLocalStorage('tasbeehHistory') || [];
          }

          function saveTasbeehHistory(history) {
               saveToLocalStorage('tasbeehHistory', history);
          }

          function loadBookmarks() {
               return loadFromLocalStorage('bookmarks') || { surahs: [], duas: [] };
          }

          function saveBookmarks(bookmarks) {
               saveToLocalStorage('bookmarks', bookmarks);
          }