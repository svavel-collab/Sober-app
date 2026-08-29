const STORAGE_KEY = 'sober_app_obsidian_v10';

let appData = {
  categories: [
    { id: '1', name: 'Alkohol', startDate: new Date().toISOString() },
    { id: '2', name: 'Amfetamin', startDate: new Date().toISOString() },
    { id: '3', name: 'Penis', startDate: new Date().toISOString() }
  ],
  trash: []
};

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { appData = JSON.parse(saved); if (!appData.trash) appData.trash = []; } catch (e) {}
  }
  updateHeaderDate();
  render();
  setInterval(render, 1000);
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
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

function render() {
  const container = document.getElementById('categoriesContainer');
  container.innerHTML = '';

  appData.categories.forEach(cat => {
    const start = new Date(cat.startDate);
    const dayNum = start.getDate();
    const monthStr = start.toLocaleDateString('sv-SE', { month: 'short' }).toUpperCase();
    const timeStr = formatTimeDifference(cat.startDate);

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
          <div class="item-name">${cat.name}</div>
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

function resetCategory(id) {
  const cat = appData.categories.find(c => c.id === id);
  if (!cat) return;
  showCustomConfirm(`Nollställ "${cat.name}" till nu?`, () => {
    cat.startDate = new Date().toISOString();
    saveData();
    render();
  });
}

function deleteCategory(id) {
  showCustomConfirm('Radera inlägget?', () => {
    const index = appData.categories.findIndex(c => c.id === id);
    if (index !== -1) {
      const removed = appData.categories.splice(index, 1)[0];
      appData.trash.push(removed);
      saveData();
      render();
    }
  });
}

function restoreCategory(id) {
  const index = appData.trash.findIndex(c => c.id === id);
  if (index !== -1) {
    const restored = appData.trash.splice(index, 1)[0];
    appData.categories.push(restored);
    saveData();
    render();
    renderTrash();
  }
}

function permanentDelete(id) {
  appData.trash = appData.trash.filter(c => c.id !== id);
  saveData();
  renderTrash();
}

document.getElementById('trashBinBtn').addEventListener('click', () => {
  renderTrash();
  document.getElementById('trashModalOverlay').style.display = 'flex';
});

function closeTrashModal() {
  document.getElementById('trashModalOverlay').style.display = 'none';
}

document.getElementById('addCatBtn').addEventListener('click', () => {
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

function saveCategory() {
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

  saveData();
  render();
  closeModal();
}

document.getElementById('settingsBtn').addEventListener('click', () => {
  document.getElementById('settingsModalOverlay').style.display = 'flex';
});

function closeSettingsModal() {
  document.getElementById('settingsModalOverlay').style.display = 'none';
}

function exportData() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const fileName = `sober_${yy}${mm}${dd}.json`;

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", fileName);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed && parsed.categories) {
        appData = parsed;
        if (!appData.trash) appData.trash = [];
        saveData();
        render();
        closeSettingsModal();
      } else {
        showCustomConfirm('Ogiltig filstruktur.', () => {});
      }
    } catch (err) {
      showCustomConfirm('Kunde inte läsa JSON-filen.', () => {});
    }
  };
  reader.readAsText(file);
}

loadData();
