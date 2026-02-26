/**
 * data-viewer.js — Data Viewer View for Carrier Helper
 *
 * This file manages the Data Viewer view which provides a
 * spreadsheet view of all entries with edit/delete capabilities,
 * and data import/export functionality.
 *
 * RESPONSIBILITIES:
 * - Data Viewer table rendering
 * - Export to CSV functionality
 * - Import from CSV (both modes: add/merge and replace)
 * - Tab navigation between views
 * - Edit entry modal (shared with Time Entries view)
 *
 * DEPENDENCIES:
 * - common.js (must be loaded first for shared utilities)
 *
 * WHAT BELONGS HERE:
 * - All DOM manipulation for the Data Viewer view
 * - Import/export event handlers
 * - Tab switching logic
 * - CSV file handling
 * - Edit entry modal logic
 *
 * WHAT DOES NOT BELONG HERE:
 * - Time Entries specific logic (see time-entries.js)
 * - Cloud sync logic (see cloud-sync.js)
 * - Shared utilities (see common.js)
 */

/* global loadEntries, saveEntries, mergeEntries, formatDate, formatTime */
/* global formatDuration, parseCSV, generateCSV, renderTimeEntries, validateEntry */
/* global validateNoOverlap, validateSingleOpenEntry */

// ── DOM References ──────────────────────────────────────────────────────────

// Tab navigation
const navTimeEntries = document.getElementById("nav-time-entries");
const navDataViewer = document.getElementById("nav-data-viewer");
const timeEntriesView = document.getElementById("time-entries-view");
const dataViewerView = document.getElementById("data-viewer-view");

// Data Viewer elements
const dvBody = document.getElementById("dv-body");
const dvEmptyMsg = document.getElementById("dv-empty-msg");
const exportBtn = document.getElementById("export-btn");
const importAddBtn = document.getElementById("import-add-btn");
const importReplaceBtn = document.getElementById("import-replace-btn");
const importFileInput = document.getElementById("import-file-input");
const deleteAllBtn = document.getElementById("delete-all-btn");
const dataMgmtBodyWrapper = document.getElementById("data-mgmt-body");
const dataMgmtToggleBtn = document.getElementById("data-mgmt-toggle");

// Week navigation elements
const dvPrevWeekBtn = document.getElementById("dv-prev-week");
const dvNextWeekBtn = document.getElementById("dv-next-week");
const dvWeekLabel = document.getElementById("dv-week-label");
const dvDateJump = document.getElementById("dv-date-jump");
const dvDateJumpBtn = document.getElementById("dv-date-jump-btn");

// ── Week Navigation Helpers ─────────────────────────────────────────────────

/**
 * Get the Monday of the week containing the given date (local time).
 * @param {Date} date
 * @returns {Date} Monday at 00:00:00 local time
 */
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, …
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Format a week range as a human-readable label (e.g., "Feb 23 – Mar 1, 2026").
 * @param {Date} weekStart - Monday of the week
 * @returns {string} Formatted label
 */
function formatWeekLabel(weekStart) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const startStr = weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endStr = weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${startStr} – ${endStr}`;
}

/**
 * Return a local date string "YYYY-MM-DD" for comparison purposes.
 * @param {string} isoString - ISO-8601 timestamp
 * @returns {string} Local date string
 */
function dvToLocalDateString(isoString) {
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** The Monday of the currently-displayed week. */
let currentWeekStart = getWeekStart(new Date());

// ── Tab Navigation ──────────────────────────────────────────────────────────

/**
 * Switch between Time Entries and Data Viewer tabs.
 * @param {string} tab - "time-entries" or "data-viewer"
 */
function showTab(tab) {
  if (tab === "data-viewer") {
    timeEntriesView.style.display = "none";
    dataViewerView.style.display = "block";
    navTimeEntries.classList.remove("active");
    navDataViewer.classList.add("active");
    renderDataViewer();
  } else {
    dataViewerView.style.display = "none";
    timeEntriesView.style.display = "block";
    navDataViewer.classList.remove("active");
    navTimeEntries.classList.add("active");
  }
}

navTimeEntries.addEventListener("click", () => showTab("time-entries"));
navDataViewer.addEventListener("click", () => showTab("data-viewer"));

// ── Data Management Collapse Toggle ─────────────────────────────────────────

dataMgmtToggleBtn.addEventListener("click", () => {
  const isCollapsed = dataMgmtBodyWrapper.classList.toggle("collapsed");
  dataMgmtToggleBtn.classList.toggle("collapsed", isCollapsed);
  dataMgmtToggleBtn.setAttribute("aria-expanded", String(!isCollapsed));
});

// ── Data Viewer Rendering ───────────────────────────────────────────────────

/**
 * Render the Data Viewer table for the current week.
 * Entries are grouped by date and displayed newest-first.
 * Shows week navigation controls.
 */
function renderDataViewer() {
  const entries = loadEntries();

  // Update week label
  dvWeekLabel.textContent = formatWeekLabel(currentWeekStart);

  if (entries.length === 0) {
    dvBody.innerHTML = "";
    dvEmptyMsg.style.display = "block";
    return;
  }

  dvEmptyMsg.style.display = "none";

  // Filter to the current week (Mon 00:00:00 to Sun 23:59:59 inclusive)
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 7); // exclusive upper bound

  // Reverse so newest entries appear first
  const weekEntries = [...entries]
    .reverse()
    .filter((e) => {
      const d = new Date(e.clockIn);
      return d >= currentWeekStart && d < weekEnd;
    });

  if (weekEntries.length === 0) {
    dvBody.innerHTML =
      `<tr><td colspan="7" class="empty-msg" style="padding:2rem 0;">No entries for this week.</td></tr>`;
    return;
  }

  // Pre-build a map of entry id → 1-based row number (based on sorted order)
  const rowNumMap = new Map(entries.map((e, i) => [e.id, i + 1]));

  let lastDate = "";
  dvBody.innerHTML = weekEntries
    .map((entry) => {
      const entryDateStr = dvToLocalDateString(entry.clockIn);
      const rowNum = rowNumMap.get(entry.id);
      const date = formatDate(entry.clockIn);
      const clockIn = formatTime(entry.clockIn);
      const clockOut = entry.clockOut ? formatTime(entry.clockOut) : "—";
      const dur = formatDuration(entry.clockIn, entry.clockOut) || "—";
      const notes = entry.notes
        ? `<span class="notes-cell" title="${entry.notes.replace(/"/g, '&quot;')}">${entry.notes}</span>`
        : `<span class="pending-cell">—</span>`;

      let html = "";
      if (entryDateStr !== lastDate) {
        lastDate = entryDateStr;
        html += `<tr class="date-group-header"><td colspan="7">${date}</td></tr>`;
      }
      html += `<tr>
      <td>${rowNum}</td>
      <td>${date}</td>
      <td>${clockIn}</td>
      <td>${clockOut}</td>
      <td>${dur}</td>
      <td>${notes}</td>
      <td>
        <button class="btn-edit" data-edit-id="${entry.id}" title="Edit entry">✏️</button>
        <button class="btn-delete" data-delete-id="${entry.id}" title="Delete entry">🗑</button>
      </td>
    </tr>`;
      return html;
    })
    .join("");
}

// ── Data Viewer Row Actions ─────────────────────────────────────────────────

dvBody.addEventListener("click", (event) => {
  const deleteBtn = event.target.closest("[data-delete-id]");
  if (deleteBtn) {
    if (!confirm("Delete this entry?")) return;
    const id = deleteBtn.dataset.deleteId;
    saveEntries(loadEntries().filter((e) => e.id !== id));
    renderDataViewer();
    if (typeof renderTimeEntries === "function") renderTimeEntries();
    return;
  }

  const editBtn = event.target.closest("[data-edit-id]");
  if (!editBtn) return;
  openEditModal(editBtn.dataset.editId);
});

// ── Edit Entry Modal ────────────────────────────────────────────────────────

/** Currently-edited entry id */
let currentEditId = null;

/**
 * Convert an ISO timestamp to a value suitable for a datetime-local input.
 * Uses manual local-time construction (not toISOString) because datetime-local
 * inputs expect local time, not UTC.
 * @param {string} iso - ISO-8601 timestamp
 * @returns {string} Local datetime string (YYYY-MM-DDTHH:MM:SS)
 */
function isoToDatetimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Open the edit entry modal pre-filled with the given entry's data.
 * @param {string} entryId - The id of the entry to edit
 */
function openEditModal(entryId) {
  const entry = loadEntries().find((e) => e.id === entryId);
  if (!entry) return;

  currentEditId = entryId;
  document.getElementById("editClockIn").value = isoToDatetimeLocal(entry.clockIn);
  document.getElementById("editClockOut").value = isoToDatetimeLocal(entry.clockOut);
  document.getElementById("editNotes").value = entry.notes || "";
  document.getElementById("editError").style.display = "none";
  document.getElementById("editEntryModal").style.display = "flex";
}

/**
 * Close the edit entry modal without saving.
 */
function closeEditModal() {
  document.getElementById("editEntryModal").style.display = "none";
  currentEditId = null;
}

/**
 * Save the currently-edited entry after validating.
 * Shows an error message if the entry is invalid.
 */
function saveEditEntry() {
  const clockInLocal = document.getElementById("editClockIn").value;
  const clockOutLocal = document.getElementById("editClockOut").value;
  const notes = document.getElementById("editNotes").value;
  const errorEl = document.getElementById("editError");

  const clockIn = clockInLocal ? new Date(clockInLocal).toISOString() : "";
  const clockOut = clockOutLocal ? new Date(clockOutLocal).toISOString() : null;

  const updatedEntry = { id: currentEditId, clockIn, clockOut, notes };

  if (!validateEntry(updatedEntry)) {
    errorEl.textContent =
      "Invalid entry: clock-in must be a valid time, and clock-out (if set) must be after clock-in.";
    errorEl.style.display = "block";
    return;
  }

  const entries = loadEntries();

  if (!validateNoOverlap(updatedEntry, entries)) {
    errorEl.textContent =
      "Invalid entry: this entry's time range overlaps with an existing entry.";
    errorEl.style.display = "block";
    return;
  }

  if (!validateSingleOpenEntry(updatedEntry, entries)) {
    errorEl.textContent =
      "Invalid entry: an in-progress entry (no clock-out) must be the most recent entry. Remove or update newer entries first.";
    errorEl.style.display = "block";
    return;
  }

  errorEl.style.display = "none";
  const idx = entries.findIndex((e) => e.id === currentEditId);
  if (idx !== -1) {
    entries[idx] = updatedEntry;
    saveEntries(entries);
  }

  closeEditModal();
  renderDataViewer();
  if (typeof renderTimeEntries === "function") renderTimeEntries();
}

// ── Week Navigation Event Handlers ─────────────────────────────────────────

dvPrevWeekBtn.addEventListener("click", () => {
  const d = new Date(currentWeekStart);
  d.setDate(d.getDate() - 7);
  currentWeekStart = d;
  renderDataViewer();
});

dvNextWeekBtn.addEventListener("click", () => {
  const d = new Date(currentWeekStart);
  d.setDate(d.getDate() + 7);
  currentWeekStart = d;
  renderDataViewer();
});

function jumpToDate() {
  const val = dvDateJump.value;
  if (!val) return;
  // Parse YYYY-MM-DD from the date input (always in this format) without
  // relying on string concatenation to avoid timezone ambiguity.
  const [y, mo, dy] = val.split("-").map(Number);
  const d = new Date(y, mo - 1, dy, 12, 0, 0);
  currentWeekStart = getWeekStart(d);
  renderDataViewer();
}

dvDateJumpBtn.addEventListener("click", jumpToDate);
dvDateJump.addEventListener("keydown", (e) => {
  if (e.key === "Enter") jumpToDate();
});

// ── Export ──────────────────────────────────────────────────────────────────

/**
 * Export all entries to a CSV file and trigger download.
 */
function exportToCSV() {
  const entries = loadEntries();
  const csv = generateCSV(entries);

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `carrier-helper-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

exportBtn.addEventListener("click", exportToCSV);

// ── Delete All Local Data ───────────────────────────────────────────────────

deleteAllBtn.addEventListener("click", () => {
  const count = loadEntries().length;
  if (
    !confirm(
      `⚠️ Delete ALL ${count} local time entries? This cannot be undone.`
    )
  )
    return;
  // Second confirmation for safety
  if (
    !confirm(
      "Are you sure? All local data will be permanently deleted."
    )
  )
    return;
  saveEntries([]);
  renderDataViewer();
  if (typeof renderTimeEntries === "function") renderTimeEntries();
});

// ── Import ──────────────────────────────────────────────────────────────────

let importMode = null; // "add" | "replace"

importAddBtn.addEventListener("click", () => {
  importMode = "add";
  importFileInput.click();
});

importReplaceBtn.addEventListener("click", () => {
  importMode = "replace";
  importFileInput.click();
});

/**
 * Handle file selection for import.
 * Parses the CSV and either merges or replaces entries based on importMode.
 */
importFileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const parsed = parseCSV(e.target.result);
    if (!parsed) {
      alert("Could not read the CSV file. Make sure it was exported from Carrier Helper.");
      importFileInput.value = "";
      return;
    }

    if (importMode === "replace") {
      if (
        !confirm(
          `Replace ALL ${loadEntries().length} existing entries with ${parsed.length} entries from the file? This cannot be undone.`
        )
      ) {
        importFileInput.value = "";
        return;
      }
      saveEntries(parsed);
    } else {
      // add / merge
      const merged = mergeEntries(loadEntries(), parsed);
      saveEntries(merged);
    }

    importFileInput.value = "";
    
    // Refresh both views
    if (typeof renderTimeEntries === "function") {
      renderTimeEntries();
    }
    renderDataViewer();
    
    alert(`Import complete. ${loadEntries().length} entries now stored.`);
  };
  reader.readAsText(file);
});

// ── Export for testing (Node.js environment) ───────────────────────────────

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    showTab,
    renderDataViewer,
    exportToCSV,
    openEditModal,
    closeEditModal,
    saveEditEntry,
    isoToDatetimeLocal,
    getWeekStart,
    formatWeekLabel,
    dvToLocalDateString
  };
}
