const STORAGE_KEY = 'sober_trackers_data';
const TRASH_KEY = 'sober_trackers_trash';

/**
 * @typedef {Object} Tracker
 * @property {string} id
 * @property {string} name
 * @property {string} startDate
 */

/** @type {Tracker[]} */
let trackers = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') || [
  { id: '1', name: 'Alkohol', startDate: new Date().toISOString() }
];

/** @type {Tracker[]} */
let trash = JSON.parse(localStorage.getItem(TRASH_KEY) || '[]');

// DOM Elements
const trackerList = document.getElementById('tracker-list');
const currentDateEl = document.getElementById('current-date');

// Main Modal
const modal = document.getElementById('modal');
const openModalBtn = document.getElementById('open-modal-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const addForm = document.getElementById('add-form');
const modalTitleEl = document.getElementById('modal-title');
const editIdInput = /** @type {HTMLInputElement | null} */ (document.getElementById('edit-id'));
const nameInput = /** @type {HTMLInputElement | null} */ (document.getElementById('category-name'));
const dateInput = /** @type {HTMLInputElement | null} */ (document.getElementById('start-date'));

// Settings Modal
const settingsModal = document.getElementById('settings-modal');
const openSettingsBtn = document.getElementById('open-settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const exportBtn = document.getElementById('export-btn');
const importBtnTrigger = document.getElementById('import-btn-trigger');
const importFileInput = /** @type {HTMLInputElement | null} */ (document.getElementById('import-file-input'));

// Trash Modal
const trashModal = document.getElementById('trash-modal');
const openTrashBtn = document.getElementById('open-trash-btn');
const closeTrashBtn = document.getElementById('close-trash-btn');
const trashListEl = document.getElementById('trash-list');
const emptyTrashBtn = document.getElementById('empty-trash-btn');

const MONTH_NAMES = ['JAN.', 'FEB.', 'MAR.', 'APR.', 'MAJ', 'JUN.', 'JUL.', 'AUG.', 'SEP.', 'OKT.', 'NOV.', 'DEC.'];

function saveTrackers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trackers));
}

function saveTrash() {
  localStorage.setItem(TRASH_KEY, JSON.stringify(trash));
}

function updateHeaderDate() {
  if (!currentDateEl) return;
  const now = new Date();
  const day = now.getDate();
  const month = MONTH_NAMES[now.getMonth()].toLowerCase().replace('.', '');
  currentDateEl.textContent = `${day} ${month}`;
}

/**
 * @param {string} startDateString
 */
function calculateTimeDiff(startDateString) {
  const start = new Date(startDateString);
  const now = new Date();

  if (isNaN(start.getTime()) || start > now) {
    return '0å 0m 0d 00:00:00';
  }

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  let hours = now.getHours() - start.getHours();
  let minutes = now.getMinutes() - start.getMinutes();
  let seconds = now.getSeconds() - start.getSeconds();

  if (seconds < 0) {
    seconds += 60;
    minutes--;
  }
  if (minutes < 0) {
    minutes += 60;
    hours--;
  }
  if (hours < 0) {
    hours += 24;
    days--;
  }
  if (days < 0) {
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthLastDay;
    months--;
  }
  if (months < 0) {
    months += 12;
    years--;
  }

  const pad = (/** @type {number} */ num) => String(num).padStart(2, '0');

  return `${years}å ${months}m ${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * @param {string} startDateString
 */
function getFormattedStartDate(startDateString) {
  const d = new Date(startDateString);
  if (isNaN(d.getTime())) {
    return { day: '1', month: 'JAN.' };
  }
  return {
    day: String(d.getDate()),
    month: MONTH_NAMES[d.getMonth()]
  };
}

function renderTrackers() {
  if (!trackerList) return;
  trackerList.innerHTML = '';

  trackers.forEach(tracker => {
    const timeFormatted = calculateTimeDiff(tracker.startDate);
    const dateFormatted = getFormattedStartDate(tracker.startDate);

    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.id = tracker.id;

    card.innerHTML = `
      <div class="date-box" onclick="resetTracker('${tracker.id}')" title="Klicka för att nollställa till nu">
        <span class="date-box-day">${dateFormatted.day}</span>
        <span class="date-box-month">${dateFormatted.month}</span>
      </div>
      <div class="card-content" onclick="openEditModal('${tracker.id}')" style="cursor: pointer;">
        <div class="card-timer">${timeFormatted}</div>
        <div class="card-title">${escapeHtml(tracker.name)}</div>
      </div>
      <button class="btn-delete-icon" onclick="deleteTracker('${tracker.id}')" aria-label="Ta bort">✕</button>
    `;

    trackerList.appendChild(card);
  });
}

function updateTimersOnly() {
  trackers.forEach(tracker => {
    const card = document.querySelector(`.card[data-id="${tracker.id}"]`);
    if (!card) return;

    const timerEl = card.querySelector('.card-timer');
    if (timerEl) {
      timerEl.textContent = calculateTimeDiff(tracker.startDate);
    }
  });
}

function renderTrash() {
  if (!trashListEl) return;
  trashListEl.innerHTML = '';

  if (trash.length === 0) {
    trashListEl.innerHTML = '<div class="empty-trash-msg">Papperskorgen är tom</div>';
    return;
  }

  trash.forEach(item => {
    const div = document.createElement('div');
    div.className = 'trash-item';
    div.innerHTML = `
      <span class="trash-item-title">${escapeHtml(item.name)}</span>
      <button class="btn-restore" onclick="restoreTracker('${item.id}')">Återställ</button>
    `;
    trashListEl.appendChild(div);
  });
}

/**
 * @param {string} id
 */
function resetTracker(id) {
  if (confirm('Vill du nollställa denna kategori till just nu?')) {
    trackers = trackers.map(t => t.id === id ? { ...t, startDate: new Date().toISOString() } : t);
    saveTrackers();
    renderTrackers();
  }
}

/**
 * @param {string} id
 */
function openEditModal(id) {
  const tracker = trackers.find(t => t.id === id);
  if (!tracker || !modal || !modalTitleEl || !nameInput || !dateInput || !editIdInput) return;

  modalTitleEl.textContent = 'Redigera kategori';
  editIdInput.value = tracker.id;
  nameInput.value = tracker.name;

  const d = new Date(tracker.startDate);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  dateInput.value = d.toISOString().slice(0, 16);

  modal.classList.remove('hidden');
}

/**
 * @param {string} id
 */
function deleteTracker(id) {
  const itemToDelete = trackers.find(t => t.id === id);
  if (!itemToDelete) return;

  trackers = trackers.filter(t => t.id !== id);
  trash.push(itemToDelete);

  saveTrackers();
  saveTrash();
  renderTrackers();
}

/**
 * @param {string} id
 */
function restoreTracker(id) {
  const itemToRestore = trash.find(t => t.id === id);
  if (!itemToRestore) return;

  trash = trash.filter(t => t.id !== id);
  trackers.push(itemToRestore);

  saveTrackers();
  saveTrash();
  renderTrackers();
  renderTrash();
}

/**
 * @param {string} str
 */
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[m] || m);
}

// Exportera funktioner för inline HTML-anrop
window.resetTracker = resetTracker;
window.deleteTracker = deleteTracker;
window.openEditModal = openEditModal;
window.restoreTracker = restoreTracker;

// Event Listeners - Kategori Modal
if (openModalBtn && modal) {
  openModalBtn.addEventListener('click', () => {
    if (!modalTitleEl || !nameInput || !dateInput || !editIdInput) return;

    modalTitleEl.textContent = 'Ny kategori';
    editIdInput.value = '';
    nameInput.value = '';

    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    dateInput.value = now.toISOString().slice(0, 16);

    modal.classList.remove('hidden');
  });
}

if (closeModalBtn && modal) {
  closeModalBtn.addEventListener('click', () => modal.classList.add('hidden'));
}

if (addForm && modal) {
  addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!nameInput || !dateInput || !editIdInput) return;

    const editId = editIdInput.value;
    const nameVal = nameInput.value.trim();
    const dateVal = new Date(dateInput.value).toISOString();

    if (editId) {
      trackers = trackers.map(t => t.id === editId ? { ...t, name: nameVal, startDate: dateVal } : t);
    } else {
      trackers.push({
        id: Date.now().toString(),
        name: nameVal,
        startDate: dateVal
      });
    }

    saveTrackers();
    renderTrackers();

    nameInput.value = '';
    editIdInput.value = '';
    modal.classList.add('hidden');
  });
}

// Event Listeners - Inställningar (Import/Export)
if (openSettingsBtn && settingsModal) {
  openSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
}
if (closeSettingsBtn && settingsModal) {
  closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
}

if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(trackers, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sober_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });
}

if (importBtnTrigger && importFileInput) {
  importBtnTrigger.addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', (e) => {
    const target = /** @type {HTMLInputElement} */ (e.target);
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedData)) {
          trackers = importedData;
          saveTrackers();
          renderTrackers();
          alert('Data har importerats framgångsrikt!');
          settingsModal?.classList.add('hidden');
        } else {
          alert('Ogiltigt filformat.');
        }
      } catch (err) {
        alert('Kunde inte läsa filen: ' + err);
      }
    };
    reader.readAsText(file);
  });
}

// Event Listeners - Papperskorg
if (openTrashBtn && trashModal) {
  openTrashBtn.addEventListener('click', () => {
    renderTrash();
    trashModal.classList.remove('hidden');
  });
}
if (closeTrashBtn && trashModal) {
  closeTrashBtn.addEventListener('click', () => trashModal.classList.add('hidden'));
}
if (emptyTrashBtn) {
  emptyTrashBtn.addEventListener('click', () => {
    if (confirm('Vill du tömma papperskorgen permanent?')) {
      trash = [];
      saveTrash();
      renderTrash();
    }
  });
}

// Init
updateHeaderDate();
renderTrackers();
setInterval(updateTimersOnly, 1000);
