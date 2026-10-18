const DB_NAME = 'SoberAppDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';
const DATA_KEY = 'sober_data';
const OLD_LOCALSTORAGE_KEY = 'sober_app_obsidian_v10';

let db = null;

let appData = {
  categories: [
    { id: '1', name: 'Alkohol', startDate: new Date().toISOString() }
  ],
  trash: []
};

// --- IndexedDB Helper Functions ---

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const dbInstance = event.target.result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      reject(event.target.error);
    };
  });
}

function getStoredData() {
  return new Promise((resolve) => {
    if (!db) return resolve(null);
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(DATA_KEY);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      resolve(null);
    };
  });
}

function saveStoredData(data) {
  return new Promise((resolve, reject) => {
    if (!db) return reject('Database not opened');
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(data, DATA_KEY);

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

// --- App Logic ---

async function loadData() {
  try {
    await openDatabase();
    const stored = await getStoredData();

    if (stored) {
      appData = stored;
      if (!appData.trash) appData.trash = [];
    } else {
      const oldSaved = localStorage.getItem(OLD_LOCALSTORAGE_KEY);
      if (oldSaved) {
        try {
          const parsed = JSON.parse(oldSaved);
          if (parsed && parsed.categories) {
            appData = parsed;
            if (!appData.trash) appData.trash = [];
            await saveStoredData(appData);
          }
        } catch (e) {
          console.error('Kunde inte migrera från localStorage:', e);
        }
      } else {
        await saveStoredData(appData);
      }
    }
  } catch (err) {
    console.warn('Fallback till minneslagring vid fel i IndexedDB:', err);
  }

  updateHeaderDate();
  render();
  setInterval(render, 1000);
}

async function saveData() {
  try {
    await saveStoredData(appData);
  } catch (e) {
    console.error('Kunde inte spara till IndexedDB:', e);
  }
}

function updateHeaderDate() {
  const options = { day: 'numeric', month: 'short' };
  document.getElementById('currentDateHeader').textContent = new Date().toLocaleDateString('sv-SE', options);
}

function formatTimeDifference(startDateStr) {
  const start = new Date(startDateStr);
  const now = new Date();
  let diff = Math.max(0, now - start);

  const seconds = Math.floor(diff / 1000) % 60;
  const minutes = Math.floor(diff / (1000 * 60)) % 60;
  const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const remainingDays = (days % 365) % 30;

  const pad = (n) => String(n).padStart(2, '0');
  return `${years}å ${months}m ${remainingDays}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function getMilestoneBadge(days) {
  if (days >= 365) return '🏆 1 År';
  if (days >= 180) return '🥇 6 Mån';
  if (days >= 90) return '🥈 3 Mån';
  if (days >= 30) return '🥉 1 Mån';
  if (days >= 7) return '⭐ 1 Vecka';
  if (days >= 1) return '✨ 1 Dag';
  return null;
}

function render() {
  const container = document.getElementById('categoriesContainer');
  if (!container) return;
  container.innerHTML = '';

  appData.categories.forEach(cat => {
    const start = new Date(cat.startDate);
    const now = new Date();
    const dayNum = start.getDate();
    const monthStr = start.toLocaleDateString('sv-SE', { month: 'short' }).toUpperCase();
    const timeStr = formatTimeDifference(cat.startDate);

    const diffMs = Math.max(0, now - start);
    const daysDiff = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const badge = getMilestoneBadge(daysDiff);
    const badgeHtml = badge ? `<span class="badge-tag">${badge}</span>` : '';

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div style="display: flex; align-items: center; flex: 1; overflow: hidden; cursor: pointer;" onclick="openEditModal('${cat.id}')" title="Klicka för att redigera">
        <div class="date-box">
          <div class="day-num">${dayNum}</div>
          <div class="day-month">${monthStr}</div>
        </div>
        <div class="info-content">
          <div class="timer-text">${timeStr}</div>
          <div class="item-name">
            ${cat.name}
            ${badgeHtml}
          </div>
        </div>
      </div>
      <div class="action-btns">
        <button class="action-icon" onclick="resetCategory('${cat.id}')" title="Nollställ tid">⏱️</button>
        <button class="action-icon" onclick="deleteCategory('${cat.id}')" title="Ta bort">✕</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderTrash() {
  const trashContainer = document.getElementById('trashContainer');
  if (!trashContainer) return;
  trashContainer.innerHTML = '';

  if (appData.trash.length === 0) {
    trashContainer.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem; text-align:center; padding: 20px;">Papperskorgen är tom.</p>';
    return;
  }

  appData.trash.forEach(cat => {
    const item = document.createElement('div');
    item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 10px 14px; border-radius: 12px; border: 1px solid var(--border-color);';
    item.innerHTML = `
      <span style="font-weight: 600; font-size: 0.95rem; color: var(--text-main);">${cat.name}</span>
      <div style="display: flex; gap: 8px;">
        <button class="btn-primary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="restoreCategory('${cat.id}')">Återställ</button>
        <button class="btn-outline" style="padding: 6px 10px; font-size: 0.8rem; color: #ef4444; border-color: rgba(239,68,68,0.4);" onclick="permanentDelete('${cat.id}')">Radera</button>
      </div>
    `;
    trashContainer.appendChild(item);
  });
}

function showCustomConfirm(message, onOk) {
  const overlay = document.getElementById('confirmModalOverlay');
  document.getElementById('confirmModalText').textContent = message;
  overlay.style.display = 'flex';

  const okBtn = document.getElementById('confirmOkBtn');
  const cancelBtn = document.getElementById('confirmCancelBtn');

  const newOkBtn = okBtn.cloneNode(true);
  const newCancelBtn = cancelBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOkBtn, okBtn);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

  newOkBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    onOk();
  });

  newCancelBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
  });
}

async function resetCategory(id) {
  const cat = appData.categories.find(c => c.id === id);
  if (!cat) return;
  showCustomConfirm(`Nollställ "${cat.name}" till nu?`, async () => {
    cat.startDate = new Date().toISOString();
    await saveData();
    render();
  });
}

async function deleteCategory(id) {
  showCustomConfirm('Radera inlägget?', async () => {
    const index = appData.categories.findIndex(c => c.id === id);
    if (index !== -1) {
      const removed = appData.categories.splice(index, 1)[0];
      appData.trash.push(removed);
      await saveData();
      render();
    }
  });
}

async function restoreCategory(id) {
  const index = appData.trash.findIndex(c => c.id === id);
  if (index !== -1) {
    const restored = appData.trash.splice(index, 1)[0];
    appData.categories.push(restored);
    await saveData();
    render();
    renderTrash();
  }
}

async function permanentDelete(id) {
  appData.trash = appData.trash.filter(c => c.id !== id);
  await saveData();
  renderTrash();
}

document.getElementById('trashBinBtn')?.addEventListener('click', () => {
  renderTrash();
  document.getElementById('trashModalOverlay').style.display = 'flex';
});

function closeTrashModal() {
  document.getElementById('trashModalOverlay').style.display = 'none';
}

document.getElementById('addCatBtn')?.addEventListener('click', () => {
  document.getElementById('modalTitle').textContent = 'Ny kategori';
  document.getElementById('editCatId').value = '';
  document.getElementById('catNameInput').value = '';
  
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('catDateInput').value = now.toISOString().slice(0, 16);
  
  document.getElementById('modalOverlay').style.display = 'flex';
});

function openEditModal(id) {
  const cat = appData.categories.find(c => c.id === id);
  if (!cat) return;

  document.getElementById('modalTitle').textContent = 'Redigera kategori';
  document.getElementById('editCatId').value = cat.id;
  document.getElementById('catNameInput').value = cat.name;

  const d = new Date(cat.startDate);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  document.getElementById('catDateInput').value = d.toISOString().slice(0, 16);

  document.getElementById('modalOverlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
}

async function saveCategory() {
  const editId = document.getElementById('editCatId').value;
  const name = document.getElementById('catNameInput').value.trim();
  const dateVal = document.getElementById('catDateInput').value;
  if (!name || !dateVal) return;

  if (editId) {
    const cat = appData.categories.find(c => c.id === editId);
    if (cat) {
      cat.name = name;
      cat.startDate = new Date(dateVal).toISOString();
    }
  } else {
    appData.categories.push({
      id: Date.now().toString(),
      name: name,
      startDate: new Date(dateVal).toISOString()
    });
  }

  await saveData();
  render();
  closeModal();
}

loadData();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
