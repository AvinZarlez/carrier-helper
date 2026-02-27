/**
 * edit-modal.js — Edit Entry Modal for Carrier Helper
 *
 * This file manages the Edit Entry modal dialog which allows
 * users to modify existing time entries (clock in/out times, notes).
 * The modal is shared between the Time Entries view and Data Viewer.
 *
 * RESPONSIBILITIES:
 * - Opening and populating the edit modal
 * - Validating edited entries
 * - Saving edited entries
 * - Closing the modal
 *
 * DEPENDENCIES:
 * - common.js (must be loaded first for storage and validation utilities)
 *
 * WHAT BELONGS HERE:
 * - All edit modal DOM manipulation
 * - Entry validation before save
 *
 * WHAT DOES NOT BELONG HERE:
 * - Table rendering (see data-viewer.js, time-entries.js)
 * - Import/export (see data-management.js)
 * - Tab navigation (see tab-navigation.js)
 */

/* global loadEntries, saveEntries, validateEntry */
/* global validateNoOverlap, validateSingleOpenEntry */
/* global renderDataViewer, renderTimeEntries */

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

// ── Export for testing (Node.js environment) ───────────────────────────────

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    openEditModal,
    closeEditModal,
    saveEditEntry,
    isoToDatetimeLocal
  };
}
