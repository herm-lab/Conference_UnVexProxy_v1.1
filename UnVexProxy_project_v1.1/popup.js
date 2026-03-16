// Ключи для хранения данных в chrome.storage.local
const STORAGE_KEY = 'fancyProxy_profiles';
const LAST_INPUT_KEY = 'fancyProxy_lastInput';
const ACTIVE_STATE_KEY = 'fancyProxy_active';

// Вспомогательные функции
function uid() {
  return Math.random().toString(36).slice(2, 9);
}
function el(id) {
  return document.getElementById(id);
}
function setStatus(msg) {
  el('status').textContent = msg;
}

// Функции для работы с хранилищем профилей
async function loadProfiles() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || [];
}
async function saveProfiles(profiles) {
  await chrome.storage.local.set({ [STORAGE_KEY]: profiles });
}

// Функции для работы с последними введёнными данными формы
async function loadLastInput() {
  const data = await chrome.storage.local.get(LAST_INPUT_KEY);
  return data[LAST_INPUT_KEY] || {};
}
async function saveLastInput(input) {
  await chrome.storage.local.set({ [LAST_INPUT_KEY]: input });
}
async function clearLastInput() {
  await chrome.storage.local.remove(LAST_INPUT_KEY);
}

// Функции для работы с активным состоянием прокси
async function loadActiveState() {
  const data = await chrome.storage.local.get(ACTIVE_STATE_KEY);
  return data[ACTIVE_STATE_KEY] || { active: false, profile: null };
}
async function saveActiveState(state) {
  await chrome.storage.local.set({ [ACTIVE_STATE_KEY]: state });
}

function renderProfiles(list) {
  const ul = el('profilesList');
  ul.innerHTML = '';
  list.forEach((p) => {
    const li = document.createElement('li');
    li.className = 'profile-item';
    const meta = document.createElement('div');
    meta.innerHTML = `<strong>${p.name || p.host}</strong> <span class="profile-meta">(${p.protocol}${p.username ? ', auth' : ''})</span>`;
    const actions = document.createElement('div');
    actions.className = 'profile-actions';

    const connectBtn = document.createElement('button');
    connectBtn.className = 'small-btn';
    connectBtn.textContent = 'Подключить';
    connectBtn.onclick = () => handleConnect(p);

    const delBtn = document.createElement('button');
    delBtn.className = 'small-btn';
    delBtn.textContent = 'Удалить';
    delBtn.onclick = async () => {
      const profiles = await loadProfiles();
      const updated = profiles.filter((x) => x.id !== p.id);
      await saveProfiles(updated);
      renderProfiles(updated);

      const state = await loadActiveState();
      if (state.profile && state.profile.id === p.id) {
        await saveActiveState({ active: false, profile: null });
        chrome.runtime.sendMessage({ type: 'clear' }, () => {
          el('proxyToggle').checked = false;
          el('toggleLabel').textContent = 'Прокси выключен';
          setStatus('Прокси отключён');
        });
      }
    };

    actions.append(connectBtn, delBtn);
    li.append(meta, actions);
    ul.appendChild(li);
  });
}

// Функция для обработки подключения к профилю
async function handleConnect(profile) {
  chrome.runtime.sendMessage({ type: 'connect', profile }, async (resp) => {
    if (resp?.ok) {
      await saveActiveState({ active: true, profile });
      el('proxyToggle').checked = true;
      el('toggleLabel').textContent = 'Прокси включен';
      setStatus(`Прокси активен: ${profile.host}`);
    } else {
      await saveActiveState({ active: false, profile: null });
      el('proxyToggle').checked = false;
      el('toggleLabel').textContent = 'Прокси выключен';
      setStatus(`Ошибка: ${resp?.error}`);
    }
  });
}

async function handleToggleChange() {
  const checked = el('proxyToggle').checked;
  const state = await loadActiveState();
  const profiles = await loadProfiles();

  if (checked) {
    // proxy on
    const exists = state.profile && profiles.find(p => p.id === state.profile.id);
    if (exists) {
      chrome.runtime.sendMessage({ type: 'connect', profile: state.profile }, async (resp) => {
        if (resp?.ok) {
          await saveActiveState({ active: true, profile: state.profile });
          el('toggleLabel').textContent = 'Прокси включен';
          setStatus(`Прокси активен: ${state.profile.host}`);
        } else {
          await saveActiveState({ active: false, profile: null });
          el('proxyToggle').checked = false;
          el('toggleLabel').textContent = 'Прокси выключен';
          setStatus('Ошибка подключения');
        }
      });
    } else {
      el('proxyToggle').checked = false;
      el('toggleLabel').textContent = 'Прокси выключен';
      await saveActiveState({ active: false, profile: null });
      setStatus('Нет активного профиля для подключения');
    }
  } else {
    // proxy off
    chrome.runtime.sendMessage({ type: 'clear' }, async () => {
      await saveActiveState({ active: false, profile: state.profile });
      el('toggleLabel').textContent = 'Прокси выключен';
      setStatus('Прокси отключён');
    });
  }
}

// Функция для восстановления данных формы из storage
function updateFormInputsFrom(data) {
  el('protocol').value = data.protocol || 'http';
  el('name').value = data.name || '';
  el('host').value = data.host || '';
  el('port').value = data.port || '';
  el('username').value = data.username || '';
  el('password').value = data.password || '';
}

// Функция для сохранения данных формы в storage
async function persistFormInputs() {
  const input = {
    protocol: 'http',
    name: el('name').value.trim(),
    host: el('host').value.trim(),
    port: el('port').value.trim(),
    username: el('username').value.trim(),
    password: el('password').value,
  };
  await saveLastInput(input);
}

// Функция для очистки формы
function clearForm() {
  el('protocol').value = 'http';
  el('name').value = '';
  el('host').value = '';
  el('port').value = '';
  el('username').value = '';
  el('password').value = '';
}

el('name').addEventListener('input', persistFormInputs);
el('host').addEventListener('input', persistFormInputs);
el('port').addEventListener('input', persistFormInputs);
el('username').addEventListener('input', persistFormInputs);
el('password').addEventListener('input', persistFormInputs);

el('saveBtn').addEventListener('click', async () => {
  const profile = {
    id: uid(),
    name: el('name').value.trim(),
    protocol: 'http',
    host: el('host').value.trim(),
    port: el('port').value.trim(),
    username: el('username').value.trim(),
    password: el('password').value,
  };
  if (!profile.host || !profile.port) {
    alert('Host и port обязательны');
    return;
  }
  const profiles = await loadProfiles();
  profiles.push(profile);
  await saveProfiles(profiles);
  await clearLastInput();
  clearForm();
  renderProfiles(profiles);
  setStatus('Профиль сохранён');
});

el('connectBtn').addEventListener('click', async () => {
  const profile = {
    id: uid(),
    name: el('name').value.trim(),
    protocol: 'http',
    host: el('host').value.trim(),
    port: el('port').value.trim(),
    username: el('username').value.trim(),
    password: el('password').value,
  };
  if (!profile.host || !profile.port) {
    alert('Host и port обязательны');
    return;
  }
  const profiles = await loadProfiles();
  profiles.push(profile);
  await saveProfiles(profiles);
  await persistFormInputs();
  renderProfiles(profiles);
  handleConnect(profile);
});

el('proxyToggle').addEventListener('change', handleToggleChange);

el('testBtn').addEventListener('click', () => {
  setStatus('Проверка...');
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) {
      setStatus('Нет активной вкладки');
      return;
    }
    const currentHost = new URL(tabs[0].url).hostname;
    chrome.runtime.sendMessage({ type: 'test', currentHost }, (resp) => {
      if (resp?.ok) {
        el('testResult').textContent = `IP через прокси: ${resp.ip}`;
        setStatus('Прокси активен');
      } else if (resp?.notActive) {
        el('testResult').textContent = 'Включен Избирательный режим. IP зависит от выбранных сайтов';
        setStatus('Прокси не активен');
      } else {
        el('testResult').textContent = `Ошибка: ${resp?.error || 'unknown'}`;
        setStatus('Прокси не активен');
      }
    });
  });
});

el('settingsBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
});

(async () => {
  renderProfiles(await loadProfiles());

  const input = await loadLastInput();
  updateFormInputsFrom(input);

  const state = await loadActiveState();
  const profiles = await loadProfiles();
  const isValid = state.profile && profiles.find(p => p.id === state.profile.id);

  if (state.active && isValid) {
    el('proxyToggle').checked = true;
    el('toggleLabel').textContent = 'Прокси включен';
  } else {
    el('proxyToggle').checked = false;
    el('toggleLabel').textContent = 'Прокси выключен';
  }

  setStatus('Ожидание действия');
})();
