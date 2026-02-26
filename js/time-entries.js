/**
 * time-entries.js — Time Entries View for Carrier Helper
 *
 * This file manages the Time Entries view which is the primary interface
 * for clocking in/out and viewing recent time entries.
 *
 * RESPONSIBILITIES:
 * - Clock in/out button handling
 * - Live clock display
 * - Time entries table rendering
 * - Individual entry deletion
 *
 * DEPENDENCIES:
 * - common.js (must be loaded first for shared utilities)
 *
 * WHAT BELONGS HERE:
 * - All DOM manipulation for the Time Entries view
 * - Event handlers specific to this view
 * - Rendering logic for the entries table
 *
 * WHAT DOES NOT BELONG HERE:
 * - Data Viewer specific logic (see data-viewer.js)
 * - Cloud sync logic (see cloud-sync.js)
 * - Shared utilities (see common.js)
 */

/* global loadEntries, saveEntries, getOpenEntry, clockOutEntry, createEntry */
/* global formatDate, formatTime, formatDuration, renderDataViewer, openEditModal */

// ── DOM References ──────────────────────────────────────────────────────────

const clockBtn = document.getElementById("clock-btn");
const statusValue = document.getElementById("status-value");
const currentTime = document.getElementById("current-time");
const entriesBody = document.getElementById("entries-body");
const emptyMsg = document.getElementById("empty-msg");
const currentShiftBody = document.getElementById("current-shift-body");
const currentShiftPanel = document.getElementById("current-shift-panel");
const currentShiftTitle = document.getElementById("current-shift-title");
const currentShiftBodyWrapper = document.getElementById("current-shift-body-wrapper");
const previousShiftsBodyWrapper = document.getElementById("previous-shifts-body-wrapper");

// ── Clock Logic ─────────────────────────────────────────────────────────────

/**
 * Handle clock in/out button click.
 * Creates a new entry on clock-in, completes the open entry on clock-out.
 */
function handleClockButton() {
  const entries = loadEntries();
  const open = getOpenEntry(entries);

  if (open) {
    // Clock out
    clockOutEntry(open);
  } else {
    // Clock in
    entries.push(createEntry());
  }

  saveEntries(entries);
  renderTimeEntries();
}

// ── Rendering ───────────────────────────────────────────────────────────────

/**
 * Return a local date string "YYYY-MM-DD" for comparison purposes.
 * Uses the local timezone rather than UTC.
 * @param {string} isoString - ISO-8601 timestamp
 * @returns {string} Local date string
 */
function toLocalDateString(isoString) {
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Build the HTML string for a row in the current-shift table (no row number).
 * @param {Object} entry
 * @returns {string} HTML table row
 */
function buildCurrentShiftRow(entry) {
  const date = formatDate(entry.clockIn);
  const clockIn = formatTime(entry.clockIn);
  const clockOut = `<span class="pending-cell">In progress…</span>`;
  const durCell = `<span class="pending-cell">—</span>`;
  const notes = entry.notes
    ? `<span class="notes-cell" title="${entry.notes.replace(/"/g, "&quot;")}">${entry.notes}</span>`
    : `<span class="pending-cell">—</span>`;
  return `
    <tr data-id="${entry.id}">
      <td>${date}</td>
      <td>${clockIn}</td>
      <td>${clockOut}</td>
      <td>${durCell}</td>
      <td>${notes}</td>
      <td>
        <button class="btn-edit" data-edit-id="${entry.id}" title="Edit entry">✏️</button>
        <button class="btn-delete" data-delete-id="${entry.id}" title="Delete entry">🗑</button>
      </td>
    </tr>`;
}

/**
 * Build the HTML string for a completed entry shown in the last-shift table (no row number).
 * @param {Object} entry
 * @returns {string} HTML table row
 */
function buildLastShiftRow(entry) {
  const date = formatDate(entry.clockIn);
  const clockIn = formatTime(entry.clockIn);
  const clockOut = formatTime(entry.clockOut);
  const dur = formatDuration(entry.clockIn, entry.clockOut);
  const durCell = dur
    ? `<span class="duration-cell">${dur}</span>`
    : `<span class="pending-cell">—</span>`;
  const notes = entry.notes
    ? `<span class="notes-cell" title="${entry.notes.replace(/"/g, "&quot;")}">${entry.notes}</span>`
    : `<span class="pending-cell">—</span>`;
  return `
    <tr data-id="${entry.id}">
      <td>${date}</td>
      <td>${clockIn}</td>
      <td>${clockOut}</td>
      <td>${durCell}</td>
      <td>${notes}</td>
      <td>
        <button class="btn-edit" data-edit-id="${entry.id}" title="Edit entry">✏️</button>
        <button class="btn-delete" data-delete-id="${entry.id}" title="Delete entry">🗑</button>
      </td>
    </tr>`;
}

/**
 * Build the HTML string for a row in the previous-shifts table (includes row number).
 * @param {Object} entry
 * @param {number} rowNum - Display row number
 * @returns {string} HTML table row
 */
function buildPreviousShiftRow(entry, rowNum) {
  const date = formatDate(entry.clockIn);
  const clockIn = formatTime(entry.clockIn);
  const clockOut = entry.clockOut
    ? formatTime(entry.clockOut)
    : `<span class="pending-cell">In progress…</span>`;
  const dur = formatDuration(entry.clockIn, entry.clockOut);
  const durCell = dur
    ? `<span class="duration-cell">${dur}</span>`
    : `<span class="pending-cell">—</span>`;
  const notes = entry.notes
    ? `<span class="notes-cell" title="${entry.notes.replace(/"/g, "&quot;")}">${entry.notes}</span>`
    : `<span class="pending-cell">—</span>`;
  return `
    <tr data-id="${entry.id}">
      <td>${rowNum}</td>
      <td>${date}</td>
      <td>${clockIn}</td>
      <td>${clockOut}</td>
      <td>${durCell}</td>
      <td>${notes}</td>
      <td>
        <button class="btn-edit" data-edit-id="${entry.id}" title="Edit entry">✏️</button>
        <button class="btn-delete" data-delete-id="${entry.id}" title="Delete entry">🗑</button>
      </td>
    </tr>`;
}

/**
 * Return the most recent completed entry (by clockIn time), or null if none.
 * @param {Array} entries - All stored entries, sorted oldest-first
 * @returns {Object|null} The last completed entry, or null
 */
function getLastShiftEntry(entries) {
  const completed = entries.filter((e) => e.clockOut !== null);
  return completed.length > 0 ? completed[completed.length - 1] : null;
}

/**
 * Return the subset of entries to display in the "Previous Shifts" section.
 * Includes all entries from the reference day (same calendar day as the
 * in-progress entry, or today) plus all entries from the most recent prior
 * day that has at least one entry.
 * @param {Array} allEntries - All stored entries. Assumed sorted oldest-first,
 *   which is guaranteed by `loadEntries()` / `saveEntries()` conventions.
 * @param {Object|null} openEntry - The current in-progress entry, or null
 * @returns {Array} Entries to display, sorted newest-first
 */
function getPreviousShiftsEntries(allEntries, openEntry) {
  // Exclude the in-progress entry from this section
  const completed = allEntries.filter((e) => e.clockOut !== null);

  if (completed.length === 0) return [];

  const refDate = openEntry ? toLocalDateString(openEntry.clockIn) : toLocalDateString(new Date().toISOString());

  // Entries from the reference day
  const refDayEntries = completed.filter((e) => toLocalDateString(e.clockIn) === refDate);

  // Entries strictly before the reference day
  const beforeRef = completed.filter((e) => toLocalDateString(e.clockIn) < refDate);

  let prevDayEntries = [];
  if (beforeRef.length > 0) {
    // Most recent previous day
    const prevDay = toLocalDateString(beforeRef[beforeRef.length - 1].clockIn);
    prevDayEntries = beforeRef.filter((e) => toLocalDateString(e.clockIn) === prevDay);
  }

  // Combine and sort newest-first for display
  return [...refDayEntries, ...prevDayEntries].reverse();
}

/**
 * Render the time entries view and update the clock button state.
 * Shows the current in-progress entry and recent previous shifts.
 */
function renderTimeEntries() {
  const entries = loadEntries();
  const open = getOpenEntry(entries);

  // Update button & status
  if (open) {
    clockBtn.textContent = "Clock Out";
    clockBtn.className = "btn btn-out";
    statusValue.textContent = "Clocked In";
    statusValue.className = "status-in";
  } else {
    clockBtn.textContent = "Clock In";
    clockBtn.className = "btn btn-in";
    statusValue.textContent = "Clocked Out";
    statusValue.className = "status-out";
  }

  // ── Current / Last Shift ────────────────────────────────────────────────
  if (open) {
    currentShiftTitle.textContent = "Current Shift";
    currentShiftPanel.style.display = "";
    currentShiftBody.innerHTML = buildCurrentShiftRow(open);
  } else {
    const last = getLastShiftEntry(entries);
    if (last) {
      currentShiftTitle.textContent = "Last Shift";
      currentShiftPanel.style.display = "";
      currentShiftBody.innerHTML = buildLastShiftRow(last);
    } else {
      currentShiftPanel.style.display = "none";
    }
  }

  // ── Previous Shifts ─────────────────────────────────────────────────────
  const previous = getPreviousShiftsEntries(entries, open);

  if (previous.length === 0) {
    entriesBody.innerHTML = "";
    emptyMsg.style.display = "block";
    return;
  }

  emptyMsg.style.display = "none";
  entriesBody.innerHTML = previous
    .map((entry, idx) => buildPreviousShiftRow(entry, previous.length - idx))
    .join("");
}

// ── Live Clock ──────────────────────────────────────────────────────────────

/**
 * Update the live clock display with the current time.
 */
function tickClock() {
  currentTime.textContent = new Date().toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

// ── Event Handlers ──────────────────────────────────────────────────────────

// Delete or edit individual entry (previous shifts table)
entriesBody.addEventListener("click", (event) => {
  const deleteBtn = event.target.closest("[data-delete-id]");
  if (deleteBtn) {
    if (!confirm("Delete this entry?")) return;
    const id = deleteBtn.dataset.deleteId;
    saveEntries(loadEntries().filter((e) => e.id !== id));
    renderTimeEntries();
    // Also refresh Data Viewer if it's visible
    if (typeof renderDataViewer === "function") {
      renderDataViewer();
    }
    return;
  }

  const editBtn = event.target.closest("[data-edit-id]");
  if (!editBtn) return;
  if (typeof openEditModal === "function") {
    openEditModal(editBtn.dataset.editId);
  }
});

// Delete or edit the current shift entry
currentShiftBody.addEventListener("click", (event) => {
  const deleteBtn = event.target.closest("[data-delete-id]");
  if (deleteBtn) {
    if (!confirm("Delete this entry?")) return;
    const id = deleteBtn.dataset.deleteId;
    saveEntries(loadEntries().filter((e) => e.id !== id));
    renderTimeEntries();
    if (typeof renderDataViewer === "function") {
      renderDataViewer();
    }
    return;
  }

  const editBtn = event.target.closest("[data-edit-id]");
  if (!editBtn) return;
  if (typeof openEditModal === "function") {
    openEditModal(editBtn.dataset.editId);
  }
});

// Clock button
clockBtn.addEventListener("click", handleClockButton);

// ── Initialization ──────────────────────────────────────────────────────────

/**
 * Initialize the Time Entries view.
 * Sets up the live clock, collapse toggles, and performs initial render.
 */
function initTimeEntriesView() {
  tickClock();
  setInterval(tickClock, 1000);

  // Collapse toggle for Current/Last Shift section
  document.getElementById("current-shift-toggle").addEventListener("click", () => {
    const btn = document.getElementById("current-shift-toggle");
    const isCollapsed = currentShiftBodyWrapper.classList.toggle("collapsed");
    btn.classList.toggle("collapsed", isCollapsed);
    btn.setAttribute("aria-expanded", String(!isCollapsed));
  });

  // Collapse toggle for Previous Shifts section
  document.getElementById("previous-shifts-toggle").addEventListener("click", () => {
    const btn = document.getElementById("previous-shifts-toggle");
    const isCollapsed = previousShiftsBodyWrapper.classList.toggle("collapsed");
    btn.classList.toggle("collapsed", isCollapsed);
    btn.setAttribute("aria-expanded", String(!isCollapsed));
  });

  renderTimeEntries();
}

// Alias for backward compatibility with cloud-sync.js
// eslint-disable-next-line no-unused-vars
const render = renderTimeEntries;

// ── Export for testing (Node.js environment) ───────────────────────────────

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    handleClockButton,
    renderTimeEntries,
    tickClock,
    initTimeEntriesView,
    toLocalDateString,
    getPreviousShiftsEntries,
    getLastShiftEntry,
    buildLastShiftRow
  };
}
