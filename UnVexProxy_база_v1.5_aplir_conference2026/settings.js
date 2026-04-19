const SELECTIVE_MODE_KEY = 'fancyProxy_selectiveMode';
const CUSTOM_SITES_KEY = 'fancyProxy_customSites';
const POPULAR_SITES_KEY = 'fancyProxy_popularSites';

function el(id) {
  return document.getElementById(id);
}

// Функция для отображения списка пользовательских сайтов
function renderSites(list) {
  const ul = el('sitesList');
  ul.innerHTML = '';
  list.forEach((site, index) => {
    const li = document.createElement('li');
    li.className = 'site-item';
    const span = document.createElement('span');
    span.textContent = site;
    const button = document.createElement('button');
    button.className = 'remove-btn';
    button.textContent = '✕';
    button.onclick = () => removeSite(index);
    li.appendChild(span);
    li.appendChild(button);
    ul.appendChild(li);
  });
}

//Загрузка настроек из хранилища и обновления UI
async function loadSettings() {
  const data = await chrome.storage.local.get([SELECTIVE_MODE_KEY, CUSTOM_SITES_KEY, POPULAR_SITES_KEY]);
  const selectiveMode = data[SELECTIVE_MODE_KEY] || false;
  const customSites = data[CUSTOM_SITES_KEY] || [];
  const popularSites = data[POPULAR_SITES_KEY] || { youtube: false, chatgpt: false, netflix: false };

  el('selectiveModeToggle').checked = selectiveMode;
  el('selectiveSettings').style.display = selectiveMode ? 'block' : 'none';
  renderSites(customSites);
  el('youtubeToggle').checked = popularSites.youtube;
  el('chatgptToggle').checked = popularSites.chatgpt;
  el('netflixToggle').checked = popularSites.netflix;
}

async function saveSettings() {
  const selectiveMode = el('selectiveModeToggle').checked;
  const customSites = await chrome.storage.local.get(CUSTOM_SITES_KEY).then(data => data[CUSTOM_SITES_KEY] || []);
  const popularSites = {
    youtube: el('youtubeToggle').checked,
    chatgpt: el('chatgptToggle').checked,
    netflix: el('netflixToggle').checked
  };

  chrome.runtime.sendMessage({
    type: 'updateSelectiveSettings',
    selectiveMode,
    customSites,
    popularSites
  });
}

el('selectiveModeToggle').addEventListener('change', () => {
  const checked = el('selectiveModeToggle').checked;
  el('selectiveSettings').style.display = checked ? 'block' : 'none';
  saveSettings();
});

el('addSiteBtn').addEventListener('click', async () => {
  const site = el('siteInput').value.trim();
  if (!site) return;
  const data = await chrome.storage.local.get(CUSTOM_SITES_KEY);
  const customSites = data[CUSTOM_SITES_KEY] || [];
  if (!customSites.includes(site)) {
    customSites.push(site);
    await chrome.storage.local.set({ [CUSTOM_SITES_KEY]: customSites });
    renderSites(customSites);
    saveSettings();
  }
  el('siteInput').value = '';
});

// Функция для удаления сайта из списка пользовательских сайтов
async function removeSite(index) {
  const data = await chrome.storage.local.get(CUSTOM_SITES_KEY);
  const customSites = data[CUSTOM_SITES_KEY] || [];
  customSites.splice(index, 1);
  await chrome.storage.local.set({ [CUSTOM_SITES_KEY]: customSites });
  renderSites(customSites);
  saveSettings();
}

el('youtubeToggle').addEventListener('change', saveSettings);
el('chatgptToggle').addEventListener('change', saveSettings);
el('netflixToggle').addEventListener('change', saveSettings);

el('backBtn').addEventListener('click', () => {
  window.close();
});

(async () => {
  await loadSettings();
})();
