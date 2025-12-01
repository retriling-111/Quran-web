//  start of app.js
 // Constants and State
          const surahListContainer = document.getElementById('surah-list');
          const duasListContainer = document.getElementById('duas-list');
          const duaCategoriesContainer = document.getElementById('dua-categories-container');
          const contentSections = document.querySelectorAll('.content-section');
          const navItems = document.querySelectorAll('.nav-menu li');
          const topNavItems = document.querySelectorAll('.top-menu li');

          const themeColorSelect = document.getElementById('theme-color-select');
          const reciterSelect = document.getElementById('reciter-select');
          const themeSwitch = document.getElementById('settings-theme-switch');

          const tasbeehDisplay = document.getElementById('tasbeeh-display');
          const tasbeehIncrementBtn = document.getElementById('tasbeeh-increment-btn');
          const tasbeehResetBtn = document.getElementById('tasbeeh-reset-btn');
          const tasbeehCurrentText = document.getElementById('tasbeeh-current-text');
          const tasbeehSuggestionsList = document.getElementById('tasbeeh-suggestions-list');
          const tasbeehHistoryList = document.getElementById('tasbeeh-history-list');

          const surahDetailsSection = document.getElementById('surah-details');
          const backToListBtn = document.getElementById('back-to-list');
          const surahDetailsTitle = document.getElementById('surah-details-title');
          const ayahsContainer = document.getElementById('surah-ayahs');
          const bismillahContainer = document.getElementById('bismillah-container');

          const allahNamesList = document.getElementById('allah-names-list');

          // Audio Player Elements
          const audioPlayerContainer = document.querySelector('.audio-player-container');
          const audioPlayer = document.getElementById('audio');
          const playPauseBtn = document.getElementById('play-pause');
          const prevAyahBtn = document.getElementById('prev-ayah');
          const nextAyahBtn = document.getElementById('next-ayah');
          const nowPlayingText = document.getElementById('now-playing-text');
          const surahInfo = document.getElementById('surah-info');
          const progressBar = document.getElementById('progress');
          const currentTimeEl = document.getElementById('current-time');
          const durationEl = document.getElementById('duration');

          let appSettings = loadSettings();
          let currentTasbeehCount = 0;
          let selectedTasbeeh = tasbeehsData[0];
          let tasbeehHistory = loadTasbeehHistory();
          let bookmarks = loadBookmarks();

          let currentSurah = null;
          let currentAyahInSurah = 0;
          let currentReciter = reciters.find(r => r.id === appSettings.reciterId) || reciters[0];
          let isPlaying = false;
          let highlightTimeout = null;
          let wordByWordData = null; // Mock data holder

          // --- Core Functions ---

          function switchSection(sectionId) {
               contentSections.forEach(section => {
                    section.classList.remove('active');
               });
               const activeSection = document.getElementById(sectionId);
               if (activeSection) {
                    activeSection.classList.add('active');
                    window.scrollTo(0, 0); // Scroll to top of the content area

                    // Update nav menu active state
                    document.querySelectorAll('.nav-menu li').forEach(item => {
                         item.classList.remove('active');
                         if (item.getAttribute('data-section') === sectionId) {
                              item.classList.add('active');
                         }
                    });

                    if (sectionId === 'favorites') {
                         renderFavorites();
                    } else if (sectionId === 'tasbeeh') {
                         renderTasbeehHistory();
                    }
               }
          }

          function applyTheme() {
               document.documentElement.setAttribute('data-theme', appSettings.theme);
               document.documentElement.style.setProperty('--secondary-color', appSettings.color);
          }

          function updateReciter() {
               currentReciter = reciters.find(r => r.id === appSettings.reciterId) || reciters[0];
               saveSettings(appSettings);
               // Re-render audio player info if active
               updateNowPlaying();
          }

          // --- Settings / Theme Handling ---

          function renderSettings() {
               // Theme Switch
               themeSwitch.checked = appSettings.theme === 'dark';

               // Theme Color Select
               themeColorSelect.value = appSettings.color;

               // Reciter Select
               reciterSelect.innerHTML = '';
               reciters.forEach(reciter => {
                    const option = document.createElement('option');
                    option.value = reciter.id;
                    option.textContent = reciter.name;
                    reciterSelect.appendChild(option);
               });
               reciterSelect.value = appSettings.reciterId;
          }

          // --- Surah List / Details ---

          function renderSurahList(surahsToRender = surahs, container = surahListContainer) {
               container.innerHTML = '';
               if (surahsToRender.length === 0) {
                    container.innerHTML = '<p style="padding: 1rem; color: var(--text-color-secondary);">No surahs found matching your search.</p>';
                    return;
               }
               surahsToRender.forEach(surah => {
                    const isBookmarked = bookmarks.surahs.includes(surah.number);
                    const card = document.createElement('div');
                    card.className = 'surah-card';
                    card.setAttribute('data-surah-number', surah.number);
                    card.innerHTML = `
                    <div class="surah-number">${surah.number}</div>
                    <div class="surah-details">
                        <h3>${surah.englishName}</h3>
                        <p>${surah.englishNameTranslation} (${surah.numberOfAyahs} Ayahs)</p>
                    </div>
                    <div class="surah-name">${surah.name}</div>
                    <button class="bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" data-type="surah" data-id="${surah.number}" aria-label="Bookmark">
                        <i class="far fa-heart fa-heart-regular"></i>
                        <i class="fas fa-heart fa-heart-solid"></i>
                    </button>
                `;
                    card.addEventListener('click', (e) => {
                         if (!e.target.closest('.bookmark-btn')) {
                              showSurahDetails(surah);
                         }
                    });
                    container.appendChild(card);
               });
          }

          // --- NEW: FETCH REAL DATA FUNCTION ---
          async function showSurahDetails(surah) {
               currentSurah = surah;
               surahDetailsTitle.textContent = `${surah.englishName} (${surah.name})`;

               // Show Loading Spinner
               ayahsContainer.innerHTML = '<div style="text-align:center; padding: 3rem;"><i class="fas fa-spinner fa-spin fa-3x" style="color: var(--secondary-color);"></i><p style="margin-top: 1rem; color: var(--text-color-secondary);">Loading Surah Text...</p></div>';
               bismillahContainer.classList.add('hidden');

               try {
                    // Fetch data from api.alquran.cloud (Uthmani Arabic + Sahih English)
                    const response = await fetch(`https://api.alquran.cloud/v1/surah/${surah.number}/editions/quran-uthmani,en.sahih`);
                    const data = await response.json();

                    if (data.code === 200) {
                         const arabicAyahs = data.data[0].ayahs;
                         const englishAyahs = data.data[1].ayahs;

                         ayahsContainer.innerHTML = ''; // Clear loader

                         // Handle Bismillah Display (Only for Surahs other than 1 and 9)
                         if (surah.number !== 1 && surah.number !== 9) {
                              bismillahContainer.textContent = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
                              bismillahContainer.classList.remove('hidden');
                         } else {
                              bismillahContainer.classList.add('hidden');
                         }

                         arabicAyahs.forEach((ayah, index) => {
                              const englishText = englishAyahs[index].text;
                              const ayahNumber = ayah.numberInSurah;
                              const arabicText = ayah.text; // Exact text from API

                              const ayahEl = document.createElement('div');
                              ayahEl.className = 'ayah';
                              ayahEl.id = `ayah-${ayahNumber}`;
                              ayahEl.setAttribute('data-ayah-number', ayahNumber);

                              ayahEl.innerHTML = `
                            <div class="ayah-header">
                                <div class="ayah-number">
                                    <span class="ayah-marker">${ayahNumber}</span>
                                    <span>${surah.englishName}</span>
                                </div>
                                <div class="ayah-actions">
                                    <i class="fas fa-play-circle ayah-play" style="font-size: 1.8rem; cursor: pointer; color: var(--secondary-color);" data-ayah-number="${ayahNumber}" title="Play Ayah"></i>
                                </div>
                            </div>
                            <div class="ayah-text">${arabicText}</div>
                            <div class="ayah-translation">${englishText}</div>
                        `;
                              ayahsContainer.appendChild(ayahEl);
                         });
                    } else {
                         ayahsContainer.innerHTML = '<p style="text-align:center; color: red; padding: 2rem;">Failed to load Surah data. Please check your internet connection.</p>';
                    }
               } catch (error) {
                    console.error(error);
                    ayahsContainer.innerHTML = '<p style="text-align:center; color: red; padding: 2rem;">Error loading data. Please try again.</p>';
               }

               switchSection('surah-details');
          }

          // --- Bookmark Functions ---

          function toggleBookmark(type, id) {
               const idKey = parseInt(id);
               if (type === 'surah') {
                    const index = bookmarks.surahs.indexOf(idKey);
                    if (index > -1) {
                         bookmarks.surahs.splice(index, 1);
                    } else {
                         bookmarks.surahs.push(idKey);
                    }
               } else if (type === 'dua') {
                    const index = bookmarks.duas.indexOf(idKey);
                    if (index > -1) {
                         bookmarks.duas.splice(index, 1);
                    } else {
                         bookmarks.duas.push(idKey);
                    }
               }
               saveBookmarks(bookmarks);
               // Re-render the affected cards
               if (document.getElementById('quran').classList.contains('active')) {
                    renderSurahList();
               }
               if (document.getElementById('duas').classList.contains('active')) {
                    renderDuas(document.querySelector('.dua-category-btn.active')?.getAttribute('data-category') || 'All');
               }
          }

          function renderFavorites() {
               const favSurahList = document.getElementById('favorite-surahs-list');
               const favDuaList = document.getElementById('favorite-duas-list');

               const favoriteSurahs = surahs.filter(s => bookmarks.surahs.includes(s.number));
               renderSurahList(favoriteSurahs, favSurahList);
               if (favoriteSurahs.length === 0) favSurahList.innerHTML = '<p style="padding: 1rem; color: var(--text-color-secondary);">No bookmarked surahs.</p>';

               const favoriteDuas = duasData.filter(d => bookmarks.duas.includes(d.id));
               renderDuasList(favoriteDuas, favDuaList);
               if (favoriteDuas.length === 0) favDuaList.innerHTML = '<p style="padding: 1rem; color: var(--text-color-secondary);">No bookmarked duas.</p>';
          }


          // --- Duas Functions ---

          function renderDuaCategories() {
               const categories = ['All', ...new Set(duasData.map(d => d.category))];
               duaCategoriesContainer.innerHTML = '';
               categories.forEach((category, index) => {
                    const btn = document.createElement('button');
                    btn.className = 'dua-category-btn';
                    btn.textContent = category;
                    btn.setAttribute('data-category', category);
                    btn.classList.toggle('active', index === 0);
                    btn.addEventListener('click', () => {
                         document.querySelectorAll('.dua-category-btn').forEach(b => b.classList.remove('active'));
                         btn.classList.add('active');
                         renderDuas(category);
                    });
                    duaCategoriesContainer.appendChild(btn);
               });
               renderDuas(categories[0]); // Render default category
          }

          function renderDuas(category) {
               const filteredDuas = category === 'All' ? duasData : duasData.filter(d => d.category === category);
               renderDuasList(filteredDuas, duasListContainer);
          }

          function renderDuasList(duasToRender, container) {
               container.innerHTML = '';
               duasToRender.forEach(dua => {
                    const isBookmarked = bookmarks.duas.includes(dua.id);
                    const card = document.createElement('div');
                    card.className = 'dua-card';
                    card.innerHTML = `
                    <button class="bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" data-type="dua" data-id="${dua.id}" aria-label="Bookmark">
                        <i class="far fa-heart fa-heart-regular"></i>
                        <i class="fas fa-heart fa-heart-solid"></i>
                    </button>
                    <h3 style="color: var(--secondary-color); margin-bottom: 0.5rem;">${dua.category}</h3>
                    <p style="font-family: 'Amiri', serif; font-size: 2rem; text-align: right; line-height: 1.8;">${dua.arabic}</p>
                    <hr/>
                    <p style="font-style: italic;">Pronoun: ${dua.transliteration}</p> 
                    <p> Meaning: ${dua.english}</p>
                    <div class="dua-actions">
                         <button class="dua-copy-btn" data-text="${dua.arabic} - ${dua.english}" aria-label="Copy Dua">
                             <i class="fas fa-copy"></i> Copy
                         </button>
                    </div>
                `;
                    container.appendChild(card);
               });
          }

          // --- 99 Names Function ---
          function renderAllahNames() {
               allahNamesList.innerHTML = '';
               allahNames.forEach((item) => {
                    const card = document.createElement('div');
                    card.className = 'name-card';
                    card.innerHTML = `
                    <div class="arabic">${item.name}</div>
                    <div class="transliteration">${item.transliteration}</div>
                    <div class="meaning">${item.meaning}</div>
                `;
                    allahNamesList.appendChild(card);
               });
          }

          // --- Last 10 Surahs Function ---
          function renderLastSurahs() {
               const last10Container = document.getElementById('last-surahs-list');
               // Get the last 10 elements of the array
               const last10Surahs = surahs.slice(-10);
               renderSurahList(last10Surahs, last10Container);
          }

          // --- Yaseen Shortcut Function ---
          function renderYaseenPage() {
               const yaseenContainer = document.getElementById('yaseen-list');
               // Find Surah 36 (Yaseen)
               const yaseenSurah = surahs.filter(s => s.number === 36);
               renderSurahList(yaseenSurah, yaseenContainer);
          }


          // --- Tasbeeh Functions ---

          function renderTasbeehSuggestions() {
               tasbeehSuggestionsList.innerHTML = '';
               tasbeehsData.forEach(t => {
                    const card = document.createElement('div');
                    card.className = 'tasbeeh-suggestion-card';
                    card.setAttribute('data-tasbeeh-id', t.id);
                    card.innerHTML = `
                    <p class="tasbeeh-arabic">${t.arabic}</p>
                    <p class="tasbeeh-transliteration">${t.transliteration}</p>
                    <p class="tasbeeh-translation">${t.english}</p>
                `;
                    card.addEventListener('click', () => {
                         selectTasbeeh(t);
                         showToast(`Selected: ${t.transliteration}`, 'info');
                    });
                    tasbeehSuggestionsList.appendChild(card);
               });
               // Select the first one by default
               selectTasbeeh(tasbeehsData[0]);
          }

          function selectTasbeeh(tasbeeh) {
               selectedTasbeeh = tasbeeh;
               currentTasbeehCount = 0;
               tasbeehDisplay.textContent = currentTasbeehCount;
               tasbeehCurrentText.textContent = selectedTasbeeh.arabic;

               // Highlight selected card
               document.querySelectorAll('.tasbeeh-suggestion-card').forEach(card => {
                    card.style.border = '1px solid #e5e7eb';
                    if (card.getAttribute('data-tasbeeh-id') == tasbeeh.id) {
                         card.style.borderColor = 'var(--secondary-color)';
                    }
               });
          }

          function incrementTasbeeh() {
               currentTasbeehCount++;
               tasbeehDisplay.textContent = currentTasbeehCount;
               // Optionally vibrate on mobile for feedback
               if (navigator.vibrate) {
                    navigator.vibrate(50);
               }
          }

          function resetTasbeeh() {
               if (currentTasbeehCount > 0) {
                    // Save to history before resetting
                    tasbeehHistory.unshift({
                         id: Date.now(),
                         text: selectedTasbeeh.arabic,
                         count: currentTasbeehCount,
                         date: new Date().toISOString(),
                    });
                    // Keep only the last 20 history items
                    tasbeehHistory = tasbeehHistory.slice(0, 20);
                    saveTasbeehHistory(tasbeehHistory);
                    renderTasbeehHistory();
                    showToast(`Saved ${currentTasbeehCount} counts for ${selectedTasbeeh.english}`, 'success');
               }
               currentTasbeehCount = 0;
               tasbeehDisplay.textContent = currentTasbeehCount;
          }

          function renderTasbeehHistory() {
               tasbeehHistoryList.innerHTML = '';
               if (tasbeehHistory.length === 0) {
                    tasbeehHistoryList.innerHTML = '<p style="color: var(--text-color-secondary);">Your tasbeeh history will appear here.</p>';
                    return;
               }

               tasbeehHistory.forEach(item => {
                    const date = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    const historyItem = document.createElement('div');
                    historyItem.className = 'tasbeeh-history-item';
                    historyItem.innerHTML = `
                    <div class="history-item-details">
                        <span class="count">${item.count}</span>
                        <span class="text">${item.text}</span>
                    </div>
                    <span class="history-item-date">${date}</span>
                `;
                    tasbeehHistoryList.appendChild(historyItem);
               });
          }


          // --- Audio Player Functions ---

          function playAyah(surahNumber, ayahNumber) {
               currentSurah = surahs.find(s => s.number === surahNumber);
               currentAyahInSurah = ayahNumber;

               // Stop any current playback and clear highlights
               audioPlayer.pause();
               document.querySelectorAll('.ayah.playing').forEach(el => el.classList.remove('playing'));

               // FIXED URL Construction for EveryAyah
               // EveryAyah expects SSSAAA.mp3 (3 digits surah, 3 digits ayah)
               const surahKey = String(currentSurah.number).padStart(3, '0');
               const ayahKey = String(ayahNumber).padStart(3, '0');
               const audioUrl = `${currentReciter.server}${surahKey}${ayahKey}.mp3`;

               // console.log("Playing:", audioUrl); // For debuggingw

               audioPlayer.src = audioUrl;
               audioPlayer.load();
               audioPlayer.play().catch(e => {
                    console.error("Audio playback failed:", e);
                    showToast("Playback failed. Please check internet connection.", 'error');
               });
               isPlaying = true;
               playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
               audioPlayerContainer.classList.add('visible');
               highlightCurrentAyah();
               updateNowPlaying();
          }

          function togglePlayPause() {
               if (audioPlayer.paused) {
                    audioPlayer.play();
                    isPlaying = true;
                    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
               } else {
                    audioPlayer.pause();
                    isPlaying = false;
                    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
               }
          }

          function playNextAyah() {
               if (currentSurah && currentAyahInSurah < currentSurah.numberOfAyahs) {
                    playAyah(currentSurah.number, currentAyahInSurah + 1);
               } else if (currentSurah && currentAyahInSurah === currentSurah.numberOfAyahs) {
                    // Move to next surah (optional feature for continuous play)
                    const nextSurah = surahs.find(s => s.number === currentSurah.number + 1);
                    if (nextSurah) {
                         showSurahDetails(nextSurah);
                         // Wait for fetch to complete? 
                         // Simpler logic: trigger play after a short delay or user interaction
                         // For now, let's stop at end of surah
                         audioPlayer.pause();
                         isPlaying = false;
                         playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
                         showToast("End of Surah. Select next Surah.", 'info');
                    } else {
                         audioPlayer.pause();
                         isPlaying = false;
                         playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
                    }
               } else {
                    showToast("End of Surah/Qur'an.", 'info');
                    audioPlayer.pause();
                    isPlaying = false;
                    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
               }
          }

          function playPrevAyah() {
               if (currentSurah && currentAyahInSurah > 1) {
                    playAyah(currentSurah.number, currentAyahInSurah - 1);
               } else {
                    showToast("First Ayah of the Surah.", 'info');
               }
          }

          function highlightCurrentAyah() {
               document.querySelectorAll('.ayah').forEach(el => el.classList.remove('playing'));
               const currentAyahEl = document.getElementById(`ayah-${currentAyahInSurah}`);
               if (currentAyahEl) {
                    currentAyahEl.classList.add('playing');
                    currentAyahEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
               }
          }

          function updateNowPlaying() {
               if (currentSurah) {
                    nowPlayingText.textContent = `Surah ${currentSurah.englishName}, Ayah ${currentAyahInSurah}`;
                    surahInfo.textContent = `Reciter: ${currentReciter.name}`;
               }
          }

          function updateProgress() {
               if (audioPlayer.duration && !isNaN(audioPlayer.duration)) {
                    progressBar.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
                    currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
                    durationEl.textContent = formatTime(audioPlayer.duration);
               } else {
                    progressBar.value = 0;
                    currentTimeEl.textContent = "0:00";
                    durationEl.textContent = "0:00";
               }
          }
          function setProgress() {
               if (audioPlayer.duration) audioPlayer.currentTime = (progressBar.value / 100) * audioPlayer.duration;
          }
          function formatTime(seconds) {
               if (isNaN(seconds)) return "0:00";
               const min = Math.floor(seconds / 60);
               const sec = Math.floor(seconds % 60);
               return `${min}:${sec < 10 ? '0' : ''}${sec}`;
          }

          // --- Utility Functions ---
          const toast = document.getElementById('toast');
          let toastTimeout;
          function showToast(message, type = 'default') {
               clearTimeout(toastTimeout);
               toast.textContent = message;
               toast.className = `toast visible ${type}`;
               toastTimeout = setTimeout(() => {
                    toast.classList.remove('visible');
               }, 3000);
          }

          function copyToClipboard(text) {
               navigator.clipboard.writeText(text).then(() => {
                    showToast('Copied to clipboard!', 'success');
               }).catch(err => {
                    console.error('Could not copy text: ', err);
                    showToast('Failed to copy text.', 'error');
               });
          }


          // --- Event Listeners and Initialization ---

          function setupEventListeners() {
               // Navigation
               navItems.forEach(item => item.addEventListener('click', (e) => switchSection(e.currentTarget.getAttribute('data-section'))));
               topNavItems.forEach(item => item.addEventListener('click', (e) => switchSection(e.currentTarget.getAttribute('data-section'))));
               backToListBtn.addEventListener('click', () => {
                    switchSection('quran');
                    audioPlayer.pause();
                    audioPlayerContainer.classList.remove('visible');
               });

               // Surah Search
               document.getElementById('surah-search').addEventListener('input', (e) => {
                    const query = e.target.value.toLowerCase();
                    const filteredSurahs = surahs.filter(s =>
                         s.englishName.toLowerCase().includes(query) ||
                         s.name.includes(query) ||
                         String(s.number).includes(query)
                    );
                    renderSurahList(filteredSurahs);
               });

               // Theme/Settings Controls
               themeSwitch.addEventListener('change', (e) => {
                    appSettings.theme = e.target.checked ? 'dark' : 'light';
                    applyTheme();
                    saveSettings(appSettings);
               });
               themeColorSelect.addEventListener('change', (e) => {
                    appSettings.color = e.target.value;
                    applyTheme();
                    saveSettings(appSettings);
               });
               reciterSelect.addEventListener('change', (e) => {
                    appSettings.reciterId = parseInt(e.target.value);
                    updateReciter();
                    // If an ayah is playing, restart it with the new reciter
                    if (currentSurah) {
                         playAyah(currentSurah.number, currentAyahInSurah);
                    }
               });

               // Tasbeeh Controls
               tasbeehIncrementBtn.addEventListener('click', incrementTasbeeh);
               tasbeehResetBtn.addEventListener('click', resetTasbeeh);

               // Global Bookmark and Copy Listeners (Delegation)
               document.addEventListener('click', (e) => {
                    // Bookmark button
                    const bookmarkBtn = e.target.closest('.bookmark-btn');
                    if (bookmarkBtn) {
                         e.stopPropagation(); // Prevent surah card click
                         const type = bookmarkBtn.getAttribute('data-type');
                         const id = bookmarkBtn.getAttribute('data-id');
                         toggleBookmark(type, id);
                         bookmarkBtn.classList.toggle('bookmarked');
                         showToast(bookmarkBtn.classList.contains('bookmarked') ? 'Bookmarked!' : 'Bookmark removed.', 'info');
                    }

                    // Ayah Play button
                    const ayahPlayBtn = e.target.closest('.ayah-play');
                    if (ayahPlayBtn && currentSurah) {
                         const ayahNumber = parseInt(ayahPlayBtn.getAttribute('data-ayah-number'));
                         playAyah(currentSurah.number, ayahNumber);
                    }

                    // Dua Copy button
                    const duaCopyBtn = e.target.closest('.dua-copy-btn');
                    if (duaCopyBtn) {
                         const textToCopy = duaCopyBtn.getAttribute('data-text');
                         copyToClipboard(textToCopy);
                    }
               });

               // Audio Player Controls
               playPauseBtn.addEventListener('click', togglePlayPause);
               nextAyahBtn.addEventListener('click', playNextAyah);
               prevAyahBtn.addEventListener('click', playPrevAyah);

               audioPlayer.addEventListener('timeupdate', updateProgress);
               audioPlayer.addEventListener('loadedmetadata', updateProgress);
               audioPlayer.addEventListener('ended', playNextAyah);
               audioPlayer.addEventListener('error', () => showToast("Error playing audio file.", 'error'));

               progressBar.addEventListener('input', setProgress);
          }

          function init() {
               // Apply saved settings
               applyTheme();
               renderSettings();

               // Render main content sections
               renderSurahList();
               renderDuaCategories();
               renderTasbeehSuggestions();
               renderTasbeehHistory();
               renderAllahNames();

               // New Render Functions
               renderLastSurahs();
               renderYaseenPage();

               // Setup global listeners
               setupEventListeners();
          }

          document.addEventListener('DOMContentLoaded', init);
          // end of app.js
