const STORAGE_KEY = 'sober_trackers_data';
const TRASH_KEY = 'sober_trackers_trash';

/**
 * @typedef {Object} HistoryEntry
 * @property {string} id
 * @property {string} startDate
 * @property {string} endDate
 */

/**
 * @typedef {Object} Tracker
 * @property {string} id
 * @property {string} name
 * @property {string} startDate
 * @property {HistoryEntry[]} [history]
 */

/** @type {Tracker[]} */
let trackers = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') || [
  { id: '1', name: 'Alkohol', startDate: new Date().toISOString(), history: [] }
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

// History Modal
const historyModal = document.getElementById('history-modal');
const closeHistoryBtn = document.getElementById('close-history-btn');
const historyListEl = document.getElementById('history-list');
const historyModalTitleEl = document.getElementById('history-modal-title');

const MONTH_NAMES = ['JAN.', 'FEB.', 'MAR.', 'APR.', 'MAJ', 'JUN.', 'JUL.', 'AUG.', 'SEP.', 'OKT.', 'NOV.', 'DEC.'];
const MONTH_NAMES_FULL = ['Jan', 'Feb', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

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

function getFormattedDateYYMMDD() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

// Omvandlar ett Date-objekt till lokalt format yyyy-MM-ddThh:mm för input-fältet
function toLocalDatetimeString(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

// Tolkar datetime-local strängen "YYYY-MM-DDTHH:mm" exakt i lokal tid utan tidszonsförskjutningar
function parseLocalDatetime(value) {
  if (!value) return new Date();
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
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

/**
 * Formaterar historikdatum: "11 Jan - 23 Mars, 2025"
 * @param {string} startStr
 * @param {string} endStr
 */
function formatHistoryDateRange(startStr, endStr) {
  const d1 = new Date(startStr);
  const d2 = new Date(endStr);
  
  const d1Day = d1.getDate();
  const d1Month = MONTH_NAMES_FULL[d1.getMonth()];
  
  const d2Day = d2.getDate();
  const d2Month = MONTH_NAMES_FULL[d2.getMonth()];
  const d2Year = d2.getFullYear();

  return `${d1Day} ${d1Month} - ${d2Day} ${d2Month}, ${d2Year}`;
}

/**
 * Räknar ut hela dagar mellan två datum
 * @param {string} startStr
 * @param {string} endStr
 */
function calculateDaysBetween(startStr, endStr) {
  const d1 = new Date(startStr);
  const d2 = new Date(endStr);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays}d`;
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
      <div style="display: flex; gap: 4px; align-items: center;">
        <button class="btn-history-icon" onclick="openHistoryModal('${tracker.id}')" aria-label="Historik" title="Visa historik">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </button>
        <button class="btn-delete-icon" onclick="deleteTracker('${tracker.id}')" aria-label="Ta bort">✕</button>
      </div>
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
    const now = new Date().toISOString();
    trackers = trackers.map(t => {
      if (t.id === id) {
        const history = t.history || [];
        history.unshift({
          id: Date.now().toString(),
          startDate: t.startDate,
          endDate: now
        });
        return { ...t, startDate: now, history };
      }
      return t;
    });
    saveTrackers();
    renderTrackers();
  }
}

/**
 * @param {string} id
 */
function openHistoryModal(id) {
  const tracker = trackers.find(t => t.id === id);
  if (!tracker || !historyModal || !historyListEl || !historyModalTitleEl) return;

  historyModalTitleEl.textContent = `Historik - ${tracker.name}`;
  historyListEl.innerHTML = '';

  const history = tracker.history || [];

  if (history.length === 0) {
    historyListEl.innerHTML = '<div class="history-empty">Ingen historik ännu</div>';
  } else {
    history.forEach(item => {
      const div = document.createElement('div');
      div.className = 'history-item';
      
      const rangeText = formatHistoryDateRange(item.startDate, item.endDate);
      const daysText = calculateDaysBetween(item.startDate, item.endDate);

      div.innerHTML = `
        <div class="history-item-left">
          <svg class="history-reset-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          <span class="history-dates">${rangeText}</span>
        </div>
        <span class="history-days">${daysText}</span>
      `;
      historyListEl.appendChild(div);
    });
  }

  historyModal.classList.remove('hidden');
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
  dateInput.value = toLocalDatetimeString(d);

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
window.openHistoryModal = openHistoryModal;

// Event Listeners - Kategori Modal
if (openModalBtn && modal) {
  openModalBtn.addEventListener('click', () => {
    if (!modalTitleEl || !nameInput || !dateInput || !editIdInput) return;

    modalTitleEl.textContent = 'Ny kategori';
    editIdInput.value = '';
    nameInput.value = '';

    const now = new Date();
    dateInput.value = toLocalDatetimeString(now);

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
    
    // Använd parseLocalDatetime för att undvika tidszonsförskjutning
    const parsedDate = parseLocalDatetime(dateInput.value);
    const newDateIso = parsedDate.toISOString();

    if (editId) {
      trackers = trackers.map(t => {
        if (t.id === editId) {
          const history = t.history || [];
          if (t.startDate !== newDateIso) {
            history.unshift({
              id: Date.now().toString(),
              startDate: t.startDate,
              endDate: newDateIso
            });
          }
          return { ...t, name: nameVal, startDate: newDateIso, history };
        }
        return t;
      });
    } else {
      trackers.push({
        id: Date.now().toString(),
        name: nameVal,
        startDate: newDateIso,
        history: []
      });
    }

    saveTrackers();
    renderTrackers();

    nameInput.value = '';
    editIdInput.value = '';
    modal.classList.add('hidden');
  });
}

// Event Listeners - Historik Modal
if (closeHistoryBtn && historyModal) {
  closeHistoryBtn.addEventListener('click', () => historyModal.classList.add('hidden'));
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
    downloadAnchor.setAttribute("download", `sober_${getFormattedDateYYMMDD()}.json`);
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
        const fileContent = event.target ? event.target.result : null;
        if (typeof fileContent === 'string') {
          const importedData = JSON.parse(fileContent);
          if (Array.isArray(importedData)) {
            trackers = importedData;
            saveTrackers();
            renderTrackers();
            alert('Data har importerats framgångsrikt!');
            settingsModal?.classList.add('hidden');
          } else {
            alert('Ogiltigt filformat.');
          }
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
