// Ключи для хранения данных в chrome.storage.local
const STORAGE_KEY = 'fancyProxy_profiles';
const SELECTIVE_MODE_KEY = 'fancyProxy_selectiveMode';
const CUSTOM_SITES_KEY = 'fancyProxy_customSites';
const POPULAR_SITES_KEY = 'fancyProxy_popularSites';

// Глобальные переменные для текущего состояния прокси
let currentProfile = null;
let selectiveMode = false;
let customSites = [];
let popularSites = { youtube: false, chatgpt: false, netflix: false };

// Генерирует PAC-скрипт для настройки прокси на основе профиля
function buildPacForProfile(p) {
  const proxyToken = p.protocol === 'socks5' ? "SOCKS5 " + p.host + ":" + p.port : "PROXY " + p.host + ":" + p.port;
  let conditions = [];

  if (selectiveMode) {
    // Создание условия для проксирования тарфика
    customSites.forEach(site => {
      conditions.push("dnsDomainIs(host, '" + site + "')");
    });
    // Популярные сайты
    if (popularSites.youtube) conditions.push("dnsDomainIs(host, 'youtube.com') || dnsDomainIs(host, 'googlevideo.com')");
    if (popularSites.chatgpt) conditions.push("dnsDomainIs(host, 'openai.com') || dnsDomainIs(host, 'chatgpt.com') || dnsDomainIs(host, 'chat.openai.com')");
    if (popularSites.netflix) conditions.push("dnsDomainIs(host, 'netflix.com') || dnsDomainIs(host, 'Netflix.com')");
    // Проксирование сайта api.ipify.org для отображения корректного ip(не зависит от избирательного режима)
    conditions.push("dnsDomainIs(host, 'api.ipify.org')");
    //ЧТО ОЗНАЧАЕТ ЭТО КОД?
    if (conditions.length === 0) {
      return "function FindProxyForURL(url, host) { return 'DIRECT'; }";
    } else {
      const conditionStr = conditions.join(' || ');
      return "function FindProxyForURL(url, host) { if (" + conditionStr + ") return '" + proxyToken + "; DIRECT'; return 'DIRECT'; }";
    }
  } else {
    return "function FindProxyForURL(url, host) { return '" + proxyToken + "; DIRECT'; }";
  }
}

// Примененеи настроек Pac-скрипта
async function applyProxy(profile) {
  const pac = buildPacForProfile(profile);
  const value = { mode: 'pac_script', pacScript: { data: pac } };
  await chrome.proxy.settings.set({ value, scope: 'regular' });
  currentProfile = profile;
  console.log('[background] Proxy applied for profile:', profile);
}

  
// Сброс профиля
async function removeProxy() {
  await chrome.proxy.settings.clear({ scope: 'regular' });
  console.log('[background] Proxy cleared');
  currentProfile = null;
}

// Обработчик аутентификации для прокси-запросов
chrome.webRequest.onAuthRequired.addListener(
  (details, callback) => {
    if (!currentProfile || !details.isProxy) return callback({});
    callback({
      authCredentials: {
        username: currentProfile.username || '',
        password: currentProfile.password || '',
      },
    });
  },
  { urls: ['<all_urls>'] },
  ['asyncBlocking']
);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case 'connect':
      applyProxy(msg.profile)
        .then(() => sendResponse({ ok: true }))
        .catch((err) => {
          removeProxy().finally(() => sendResponse({ ok: false, error: err.message }));
        });
      return true;

    case 'clear':
      removeProxy().then(() => sendResponse({ ok: true }));
      return true;

    case 'test':
      if (selectiveMode) {
        const currentHost = msg.currentHost;
        let isSelected = false;
        // Есть ли в хосте сайты из Избирательного режима(ручные)
        if (customSites.some(site => currentHost.includes(site))) isSelected = true;
        // Есть ли в хосте сайты из Избирательного режима(популярные)
        if (popularSites.youtube && (currentHost.includes('youtube.com') || currentHost.includes('googlevideo.com'))) isSelected = true;
        if (popularSites.chatgpt && (currentHost.includes('openai.com') || currentHost.includes('chatgpt.com'))) isSelected = true;
        if (popularSites.instagram && (currentHost.includes('netflix.com') || currentHost.includes('netflix.com'))) isSelected = true;
        if (!isSelected) {
          sendResponse({ notActive: true });
          return true;
        }
      }
      // Вкладка на api.ipify.org для теста IP
      chrome.tabs.create({ url: 'https://api.ipify.org?format=json', active: false }, (tab) => {
        if (!tab) {
          sendResponse({ ok: false, error: 'Failed to create tab' });
          return;
        }
        // Wait полной загрузки файла(ожидание события 'complete')
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
          if (tabId === tab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            // Извлечение ip из api.ipify.org
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                try {
                  const text = document.body.textContent;
                  const json = JSON.parse(text);
                  return { ok: true, ip: json.ip };
                } catch (e) {
                  return { ok: false, error: e.message };
                }
              }
            }, (results) => {
              // Закрытие api.ipify.org
              chrome.tabs.remove(tab.id);
              if (results && results[0]) {
                sendResponse(results[0].result);
              } else {
                sendResponse({ ok: false, error: 'Перезапустите прокси' });
              }
            });
          }
        });
      });
      return true;

    case 'updateSelectiveSettings':
      selectiveMode = msg.selectiveMode;
      customSites = msg.customSites;
      popularSites = msg.popularSites;
      chrome.storage.local.set({
        [SELECTIVE_MODE_KEY]: selectiveMode,
        [CUSTOM_SITES_KEY]: customSites,
        [POPULAR_SITES_KEY]: popularSites
      });
      if (currentProfile) {
        if (!selectiveMode) {
          // Переподключение для избежания  error Script execution failed
          removeProxy().then(() => {
            setTimeout(() => {
              applyProxy(currentProfile).catch(console.error);
            }, 100);
          });
        } else {
          applyProxy(currentProfile).catch(console.error);
        }
      }
      sendResponse({ ok: true });
      return true;

    default:
      sendResponse({ ok: false, error: 'Unknown message type' });
      return false;
  }
});

// Загрузка настроек избирательного режима из storage
async function loadSelectiveSettings() {
  const data = await chrome.storage.local.get([SELECTIVE_MODE_KEY, CUSTOM_SITES_KEY, POPULAR_SITES_KEY]);
  selectiveMode = data[SELECTIVE_MODE_KEY] || false;
  customSites = data[CUSTOM_SITES_KEY] || [];
  popularSites = data[POPULAR_SITES_KEY] || { youtube: false, chatgpt: false, instagram: false };
}

// Инициализация storage
(async () => {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  if (!stored[STORAGE_KEY]) {
    await chrome.storage.local.set({ [STORAGE_KEY]: [] });
  }
  await loadSelectiveSettings();
})();
