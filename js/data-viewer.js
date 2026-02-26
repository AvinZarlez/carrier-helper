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
/* global loadMetaData, saveMetaData, generateMetaDataCSV, parseMetaDataCSV */
/* global detectCSVType, generateAllDataCSV, parseAllDataCSV, renderMetaDataForm */
/* global filterEntriesByRange, getExportEntries */

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
const exportRangeBtn = document.getElementById("export-range-btn");
const exportRangeForm = document.getElementById("export-range-form");
const exportRangeStartEl = document.getElementById("export-range-start");
const exportRangeEndEl = document.getElementById("export-range-end");
const exportRangeConfirmBtn = document.getElementById("export-range-confirm-btn");
const exportRangeCancelBtn = document.getElementById("export-range-cancel-btn");
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
const dvWeekNavRow = document.getElementById("dv-week-nav-row");

// View mode toggle elements
const dvModeWeekBtn = document.getElementById("dv-mode-week");
const dvModeRangeBtn = document.getElementById("dv-mode-range");
const dvCustomRangeRow = document.getElementById("dv-custom-range-row");
const dvRangeStart = document.getElementById("dv-range-start");
const dvRangeEnd = document.getElementById("dv-range-end");
const dvRangeApplyBtn = document.getElementById("dv-range-apply-btn");
const dvRangeLabel = document.getElementById("dv-range-label");

// Multi-select elements
const dvSelectionBanner = document.getElementById("dv-selection-banner");
const dvSelectionCount = document.getElementById("dv-selection-count");
const dvDeleteSelectedBtn = document.getElementById("dv-delete-selected-btn");
const dvDeselectAllBtn = document.getElementById("dv-deselect-all-btn");
const dvSelectAllBtn = document.getElementById("dv-select-all-btn");

// Sub-tab navigation
const dvSubTimeEntries = document.getElementById("dv-sub-time-entries");
const dvSubMetaData = document.getElementById("dv-sub-meta-data");
const dvTimeEntriesSub = document.getElementById("dv-time-entries-sub");
const dvMetaDataSub = document.getElementById("dv-meta-data-sub");
const exportAllBtn = document.getElementById("export-all-btn");
const exportMetaDataBtn = document.getElementById("export-metadata-btn");

/** Currently active data-viewer sub-tab: "time-entries" or "meta-data". */
let activeSubTab = "time-entries";

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

/**
 * Format a date range as a human-readable label.
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {string} Formatted label (e.g., "Feb 1 – Feb 28, 2026")
 */
function formatRangeLabel(start, end) {
  const startStr = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endStr = end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${startStr} – ${endStr}`;
}

/**
 * Convert a Date to a YYYY-MM-DD string suitable for a date input value.
 * @param {Date} date
 * @returns {string} Date string in YYYY-MM-DD format
 */
function dateToInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** The Monday of the currently-displayed week. */
let currentWeekStart = getWeekStart(new Date());

/** Current view mode: "week" or "range". */
let viewMode = "week";

/** Custom range start date string (YYYY-MM-DD), used when viewMode === "range". */
let customRangeStart = "";

/** Custom range end date string (YYYY-MM-DD), used when viewMode === "range". */
let customRangeEnd = "";

/**
 * Get the start and end Date objects for the currently displayed view.
 * In week mode, returns the Monday and Sunday of the current week.
 * In range mode, returns the custom range dates (or null if not set).
 * @returns {{start: Date, end: Date}}
 */
function getCurrentViewRange() {
  if (viewMode === "range" && customRangeStart && customRangeEnd) {
    return {
      start: new Date(customRangeStart + "T00:00:00"),
      end: new Date(customRangeEnd + "T00:00:00")
    };
  }
  // Default: current week (Monday to Sunday inclusive)
  const end = new Date(currentWeekStart);
  end.setDate(end.getDate() + 6);
  return { start: new Date(currentWeekStart), end };
}

// ── Multi-select State ──────────────────────────────────────────────────────

/** Set of currently selected entry IDs. */
const selectedEntryIds = new Set();

/**
 * Update the fixed selection banner to reflect the current selection.
 */
function updateSelectionBanner() {
  if (selectedEntryIds.size === 0) {
    dvSelectionBanner.style.display = "none";
  } else {
    dvSelectionBanner.style.display = "flex";
    const n = selectedEntryIds.size;
    dvSelectionCount.textContent = `${n} entr${n === 1 ? "y" : "ies"} selected`;
  }
}

/**
 * Sync the indeterminate/checked state of each day-group checkbox based on
 * which row checkboxes within that date are checked.
 */
function updateDayCheckboxStates() {
  dvBody.querySelectorAll(".dv-day-checkbox").forEach((dayCheckbox) => {
    const date = dayCheckbox.dataset.date;
    const rowCbs = Array.from(
      dvBody.querySelectorAll(`.dv-row-checkbox[data-date="${date}"]`)
    );
    const checkedCount = rowCbs.filter((cb) => cb.checked).length;
    if (checkedCount === 0) {
      dayCheckbox.checked = false;
      dayCheckbox.indeterminate = false;
    } else if (checkedCount === rowCbs.length) {
      dayCheckbox.checked = true;
      dayCheckbox.indeterminate = false;
    } else {
      dayCheckbox.checked = false;
      dayCheckbox.indeterminate = true;
    }
  });
}

/**
 * Deselect all entries, uncheck all checkboxes, and hide the banner.
 */
function clearSelection() {
  selectedEntryIds.clear();
  dvBody.querySelectorAll(".dv-row-checkbox").forEach((cb) => {
    cb.checked = false;
    cb.closest("tr").classList.remove("dv-row-selected");
  });
  updateDayCheckboxStates();
  updateSelectionBanner();
}

/**
 * Delete all currently selected entries after confirmation.
 */
function deleteSelected() {
  const count = selectedEntryIds.size;
  if (
    !confirm(
      `Delete ${count} selected entr${count === 1 ? "y" : "ies"}? This cannot be undone.`
    )
  )
    return;
  const idsToDelete = new Set(selectedEntryIds);
  selectedEntryIds.clear();
  saveEntries(loadEntries().filter((e) => !idsToDelete.has(e.id)));
  renderDataViewer();
  if (typeof renderTimeEntries === "function") renderTimeEntries();
}

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
    if (activeSubTab === "meta-data") {
      if (typeof renderMetaDataForm === "function") renderMetaDataForm();
    } else {
      renderDataViewer();
    }
  } else {
    dataViewerView.style.display = "none";
    timeEntriesView.style.display = "block";
    navDataViewer.classList.remove("active");
    navTimeEntries.classList.add("active");
  }
}

navTimeEntries.addEventListener("click", () => showTab("time-entries"));
navDataViewer.addEventListener("click", () => showTab("data-viewer"));

// ── Data Viewer Sub-tab Navigation ──────────────────────────────────────────

/**
 * Switch between Time Entries and Meta Data sub-tabs within the Data Viewer.
 * @param {string} subTab - "time-entries" or "meta-data"
 */
function showSubTab(subTab) {
  activeSubTab = subTab;
  if (subTab === "meta-data") {
    dvTimeEntriesSub.style.display = "none";
    dvMetaDataSub.style.display = "block";
    dvSubTimeEntries.classList.remove("active");
    dvSubMetaData.classList.add("active");
    if (typeof renderMetaDataForm === "function") renderMetaDataForm();
  } else {
    dvMetaDataSub.style.display = "none";
    dvTimeEntriesSub.style.display = "block";
    dvSubMetaData.classList.remove("active");
    dvSubTimeEntries.classList.add("active");
    renderDataViewer();
  }
}

dvSubTimeEntries.addEventListener("click", () => showSubTab("time-entries"));
dvSubMetaData.addEventListener("click", () => showSubTab("meta-data"));

// ── Data Management Collapse Toggle ─────────────────────────────────────────

dataMgmtToggleBtn.addEventListener("click", () => {
  const isCollapsed = dataMgmtBodyWrapper.classList.toggle("collapsed");
  dataMgmtToggleBtn.classList.toggle("collapsed", isCollapsed);
  dataMgmtToggleBtn.setAttribute("aria-expanded", String(!isCollapsed));
});

// ── Data Viewer Rendering ───────────────────────────────────────────────────

/**
 * Render the Data Viewer table for the current view (week or custom range).
 * Entries are grouped by date and displayed newest-first.
 * Shows week navigation controls in week mode, or date range inputs in range mode.
 */
function renderDataViewer() {
  const entries = loadEntries();

  // Determine the view range and update the label
  let viewStart, viewEnd, emptyRangeMsg;
  if (viewMode === "range") {
    if (customRangeStart && customRangeEnd) {
      viewStart = new Date(customRangeStart + "T00:00:00");
      viewEnd = new Date(customRangeEnd + "T23:59:59.999");
      dvRangeLabel.textContent = formatRangeLabel(
        new Date(customRangeStart + "T00:00:00"),
        new Date(customRangeEnd + "T00:00:00")
      );
    } else {
      dvRangeLabel.textContent = "Select a date range above";
      dvBody.innerHTML = "";
      dvEmptyMsg.style.display = "block";
      updateSelectionBanner();
      return;
    }
    emptyRangeMsg = "No entries in this date range.";
  } else {
    viewStart = currentWeekStart;
    viewEnd = new Date(currentWeekStart);
    viewEnd.setDate(viewEnd.getDate() + 7); // exclusive upper bound
    dvWeekLabel.textContent = formatWeekLabel(currentWeekStart);
    emptyRangeMsg = "No entries for this week.";
  }

  if (entries.length === 0) {
    dvBody.innerHTML = "";
    dvEmptyMsg.style.display = "block";
    return;
  }

  dvEmptyMsg.style.display = "none";

  // Reverse so newest entries appear first
  const viewEntries = [...entries]
    .reverse()
    .filter((e) => {
      const d = new Date(e.clockIn);
      return d >= viewStart && d < viewEnd;
    });

  if (viewEntries.length === 0) {
    dvBody.innerHTML =
      `<tr><td colspan="8" class="empty-msg" style="padding:2rem 0;">${emptyRangeMsg}</td></tr>`;
    updateSelectionBanner();
    return;
  }

  // Pre-build a map of entry id → 1-based row number (based on sorted order)
  const rowNumMap = new Map(entries.map((e, i) => [e.id, i + 1]));

  let lastDate = "";
  dvBody.innerHTML = viewEntries
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
        html += `<tr class="date-group-header">
          <td><input type="checkbox" class="dv-day-checkbox" data-date="${entryDateStr}" /></td>
          <td colspan="7">${date}</td>
        </tr>`;
      }
      const isSelected = selectedEntryIds.has(entry.id);
      html += `<tr${isSelected ? ' class="dv-row-selected"' : ''}>
      <td><input type="checkbox" class="dv-row-checkbox" data-id="${entry.id}" data-date="${entryDateStr}"${isSelected ? " checked" : ""} /></td>
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

  // Sync day-checkbox states and banner after re-render
  updateDayCheckboxStates();
  updateSelectionBanner();
}

// ── Data Viewer Row Actions ─────────────────────────────────────────────────

dvBody.addEventListener("click", (event) => {
  // Row checkbox — toggle selection
  const rowCheckbox = event.target.closest(".dv-row-checkbox");
  if (rowCheckbox) {
    const id = rowCheckbox.dataset.id;
    if (rowCheckbox.checked) {
      selectedEntryIds.add(id);
    } else {
      selectedEntryIds.delete(id);
    }
    rowCheckbox.closest("tr").classList.toggle("dv-row-selected", rowCheckbox.checked);
    updateDayCheckboxStates();
    updateSelectionBanner();
    return;
  }

  // Day-group checkbox — select/deselect all entries for that date
  const dayCheckbox = event.target.closest(".dv-day-checkbox");
  if (dayCheckbox) {
    const date = dayCheckbox.dataset.date;
    const rowCbs = dvBody.querySelectorAll(`.dv-row-checkbox[data-date="${date}"]`);
    rowCbs.forEach((cb) => {
      cb.checked = dayCheckbox.checked;
      if (dayCheckbox.checked) {
        selectedEntryIds.add(cb.dataset.id);
      } else {
        selectedEntryIds.delete(cb.dataset.id);
      }
      cb.closest("tr").classList.toggle("dv-row-selected", dayCheckbox.checked);
    });
    updateSelectionBanner();
    return;
  }

  const deleteBtn = event.target.closest("[data-delete-id]");
  if (deleteBtn) {
    if (!confirm("Delete this entry?")) return;
    const id = deleteBtn.dataset.deleteId;
    selectedEntryIds.delete(id);
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
  selectedEntryIds.clear();
  const d = new Date(currentWeekStart);
  d.setDate(d.getDate() - 7);
  currentWeekStart = d;
  renderDataViewer();
});

dvNextWeekBtn.addEventListener("click", () => {
  selectedEntryIds.clear();
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
  selectedEntryIds.clear();
  currentWeekStart = getWeekStart(d);
  renderDataViewer();
}

dvDateJumpBtn.addEventListener("click", jumpToDate);
dvDateJump.addEventListener("keydown", (e) => {
  if (e.key === "Enter") jumpToDate();
});

// ── View Mode Toggle ────────────────────────────────────────────────────────

/**
 * Switch the data viewer between weekly mode and custom range mode.
 * @param {string} mode - "week" or "range"
 */
function setViewMode(mode) {
  viewMode = mode;
  if (mode === "range") {
    dvModeWeekBtn.classList.remove("active");
    dvModeRangeBtn.classList.add("active");
    dvWeekNavRow.style.display = "none";
    dvCustomRangeRow.style.display = "flex";
    // Pre-fill with current week range if no custom range set yet
    if (!customRangeStart || !customRangeEnd) {
      const range = getCurrentViewRange();
      customRangeStart = dateToInputValue(range.start);
      customRangeEnd = dateToInputValue(range.end);
      dvRangeStart.value = customRangeStart;
      dvRangeEnd.value = customRangeEnd;
    }
  } else {
    dvModeRangeBtn.classList.remove("active");
    dvModeWeekBtn.classList.add("active");
    dvCustomRangeRow.style.display = "none";
    dvWeekNavRow.style.display = "flex";
  }
  selectedEntryIds.clear();
  renderDataViewer();
}

dvModeWeekBtn.addEventListener("click", () => setViewMode("week"));
dvModeRangeBtn.addEventListener("click", () => setViewMode("range"));

dvRangeApplyBtn.addEventListener("click", () => {
  const startVal = dvRangeStart.value;
  const endVal = dvRangeEnd.value;
  if (!startVal || !endVal) return;
  customRangeStart = startVal;
  customRangeEnd = endVal;
  selectedEntryIds.clear();
  renderDataViewer();
});

dvRangeStart.addEventListener("keydown", (e) => {
  if (e.key === "Enter") dvRangeApplyBtn.click();
});
dvRangeEnd.addEventListener("keydown", (e) => {
  if (e.key === "Enter") dvRangeApplyBtn.click();
});



dvSelectAllBtn.addEventListener("click", () => {
  dvBody.querySelectorAll(".dv-row-checkbox").forEach((cb) => {
    cb.checked = true;
    selectedEntryIds.add(cb.dataset.id);
    cb.closest("tr").classList.add("dv-row-selected");
  });
  updateDayCheckboxStates();
  updateSelectionBanner();
});

dvDeleteSelectedBtn.addEventListener("click", deleteSelected);
dvDeselectAllBtn.addEventListener("click", clearSelection);

// ── Export ──────────────────────────────────────────────────────────────────

/**
 * Export time entries for the current view as CSV.
 * If entries are selected, exports only those. Otherwise exports all entries
 * visible in the current date view (week or custom range).
 * Entries outside the current view range are never included.
 */
function exportToCSV() {
  let viewStart, viewEnd, exclusiveEnd;
  if (viewMode === "range" && customRangeStart && customRangeEnd) {
    viewStart = new Date(customRangeStart + "T00:00:00");
    viewEnd = new Date(customRangeEnd + "T23:59:59.999");
    exclusiveEnd = false;
  } else {
    viewStart = currentWeekStart;
    viewEnd = new Date(currentWeekStart);
    viewEnd.setDate(viewEnd.getDate() + 7); // exclusive upper bound (same as renderDataViewer)
    exclusiveEnd = true;
  }

  const entries = getExportEntries(loadEntries(), selectedEntryIds, viewStart, viewEnd, exclusiveEnd);
  const csv = generateCSV(entries);
  const filename = `carrier-helper-${new Date().toISOString().slice(0, 10)}.csv`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export metadata (USPS pay scale settings) as a CSV file.
 */
function exportMetaDataToCSV() {
  const meta = loadMetaData();
  const csv = generateMetaDataCSV(meta);

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `carrier-helper-metadata-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export all data (both time entries and metadata) as a single CSV file.
 */
function exportAllDataToCSV() {
  const entries = loadEntries();
  const meta = loadMetaData();
  const csv = generateAllDataCSV(entries, meta);

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `carrier-helper-all-data-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

exportBtn.addEventListener("click", exportToCSV);
exportMetaDataBtn.addEventListener("click", exportMetaDataToCSV);
exportAllBtn.addEventListener("click", exportAllDataToCSV);

// ── Export Date Range ───────────────────────────────────────────────────────

/**
 * Export entries within a user-specified date range to a CSV file.
 */
function exportRangeToCSV() {
  const startVal = exportRangeStartEl.value;
  const endVal = exportRangeEndEl.value;

  if (!startVal || !endVal) {
    alert("Please select both a start and end date.");
    return;
  }

  const start = new Date(startVal + "T00:00:00");
  const end = new Date(endVal + "T23:59:59.999");

  if (start > end) {
    alert("Start date must be before or equal to end date.");
    return;
  }

  const entries = loadEntries().filter((e) => {
    const d = new Date(e.clockIn);
    return d >= start && d <= end;
  });

  if (entries.length === 0) {
    alert("No entries found in the selected date range.");
    return;
  }

  const csv = generateCSV(entries);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `carrier-helper-${startVal}-to-${endVal}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Whether the export date range form is currently visible. */
let exportRangeFormVisible = false;

exportRangeBtn.addEventListener("click", () => {
  exportRangeFormVisible = !exportRangeFormVisible;
  if (!exportRangeFormVisible) {
    exportRangeForm.style.display = "none";
    return;
  }
  // Pre-fill with current view range
  const range = getCurrentViewRange();
  exportRangeStartEl.value = dateToInputValue(range.start);
  exportRangeEndEl.value = dateToInputValue(range.end);
  exportRangeForm.style.display = "block";
});

exportRangeConfirmBtn.addEventListener("click", exportRangeToCSV);

exportRangeCancelBtn.addEventListener("click", () => {
  exportRangeFormVisible = false;
  exportRangeForm.style.display = "none";
});

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
 * Auto-detects the CSV type (entries, metadata, or combined) and handles accordingly.
 */
importFileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    const csvType = detectCSVType(text);

    if (csvType === "unknown") {
      alert("Could not read the CSV file. Make sure it was exported from Carrier Helper.");
      importFileInput.value = "";
      return;
    }

    if (csvType === "all") {
      // Combined file: import both entries and metadata
      const parsed = parseAllDataCSV(text);
      if (!parsed) {
        alert("Could not parse the combined data file.");
        importFileInput.value = "";
        return;
      }
      if (importMode === "replace") {
        if (!confirm(`Replace all data with ${parsed.entries.length} entries and metadata settings from the file? This cannot be undone.`)) {
          importFileInput.value = "";
          return;
        }
        saveEntries(parsed.entries);
        if (Object.keys(parsed.meta).length > 0) {
          saveMetaData({ ...loadMetaData(), ...parsed.meta });
        }
      } else {
        const merged = mergeEntries(loadEntries(), parsed.entries);
        saveEntries(merged);
        if (Object.keys(parsed.meta).length > 0) {
          saveMetaData({ ...loadMetaData(), ...parsed.meta });
        }
      }
      importFileInput.value = "";
      if (typeof renderTimeEntries === "function") renderTimeEntries();
      if (typeof renderMetaDataForm === "function") renderMetaDataForm();
      renderDataViewer();
      alert(`Import complete. ${loadEntries().length} entries and metadata settings imported.`);

    } else if (csvType === "metadata") {
      // Metadata only
      const parsed = parseMetaDataCSV(text);
      if (!parsed) {
        alert("Could not parse the metadata CSV file.");
        importFileInput.value = "";
        return;
      }
      if (importMode === "replace") {
        if (!confirm("Replace all metadata settings with values from the file? This cannot be undone.")) {
          importFileInput.value = "";
          return;
        }
        saveMetaData(parsed);
      } else {
        saveMetaData({ ...loadMetaData(), ...parsed });
      }
      importFileInput.value = "";
      if (typeof renderMetaDataForm === "function") renderMetaDataForm();
      alert("Import complete. Metadata settings updated.");

    } else {
      // Time entries
      const parsed = parseCSV(text);
      if (!parsed) {
        alert("Could not read the CSV file. Make sure it was exported from Carrier Helper.");
        importFileInput.value = "";
        return;
      }
      if (importMode === "replace") {
        if (!confirm(`Replace ALL ${loadEntries().length} existing entries with ${parsed.length} entries from the file? This cannot be undone.`)) {
          importFileInput.value = "";
          return;
        }
        saveEntries(parsed);
      } else {
        const merged = mergeEntries(loadEntries(), parsed);
        saveEntries(merged);
      }
      importFileInput.value = "";
      if (typeof renderTimeEntries === "function") renderTimeEntries();
      renderDataViewer();
      alert(`Import complete. ${loadEntries().length} entries now stored.`);
    }
  };
  reader.readAsText(file);
});

// ── Export for testing (Node.js environment) ───────────────────────────────

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    showTab,
    showSubTab,
    renderDataViewer,
    exportToCSV,
    exportMetaDataToCSV,
    exportAllDataToCSV,
    exportRangeToCSV,
    openEditModal,
    closeEditModal,
    saveEditEntry,
    isoToDatetimeLocal,
    getWeekStart,
    formatWeekLabel,
    formatRangeLabel,
    dateToInputValue,
    dvToLocalDateString,
    getCurrentViewRange,
    setViewMode,
    clearSelection,
    deleteSelected,
    updateSelectionBanner
  };
}
