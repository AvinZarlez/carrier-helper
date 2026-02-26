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
/* global formatDuration, parseCSV, generateCSV, renderTimeEntries */

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

// ── Data Viewer Rendering ───────────────────────────────────────────────────

/**
 * Render the Data Viewer table with all entries.
 * Shows entries with edit and delete action buttons.
 */
function renderDataViewer() {
  const entries = loadEntries();

  if (entries.length === 0) {
    dvBody.innerHTML = "";
    dvEmptyMsg.style.display = "block";
    return;
  }

  dvEmptyMsg.style.display = "none";
  dvBody.innerHTML = [...entries]
    .reverse()
    .map((entry, idx) => {
      const rowNum = entries.length - idx;
      const date = formatDate(entry.clockIn);
      const clockIn = formatTime(entry.clockIn);
      const clockOut = entry.clockOut ? formatTime(entry.clockOut) : "—";
      const dur = formatDuration(entry.clockIn, entry.clockOut) || "—";
      const notes = entry.notes
        ? `<span class="notes-cell" title="${entry.notes.replace(/"/g, '&quot;')}">${entry.notes}</span>`
        : `<span class="pending-cell">—</span>`;
      return `<tr>
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

  errorEl.style.display = "none";
  const entries = loadEntries();
  const idx = entries.findIndex((e) => e.id === currentEditId);
  if (idx !== -1) {
    entries[idx] = updatedEntry;
    saveEntries(entries);
  }

  closeEditModal();
  renderDataViewer();
  if (typeof renderTimeEntries === "function") renderTimeEntries();
}

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
    isoToDatetimeLocal
  };
}
