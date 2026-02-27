/**
 * data-viewer.js — Data Viewer View for Carrier Helper
 *
 * This file manages the Data Viewer view which provides a
 * read-only spreadsheet view of all entries with week/custom range
 * navigation and multi-select capabilities.
 *
 * RESPONSIBILITIES:
 * - Data Viewer table rendering
 * - Week and custom range navigation
 * - View mode switching (week vs custom range)
 * - Multi-select / checkbox logic
 * - Row action event delegation (delete, edit)
 *
 * DEPENDENCIES:
 * - common.js (must be loaded first for shared utilities)
 * - edit-modal.js (for openEditModal)
 *
 * WHAT BELONGS HERE:
 * - Data viewer table rendering and navigation
 * - Multi-select state and UI
 *
 * WHAT DOES NOT BELONG HERE:
 * - Tab navigation (see tab-navigation.js)
 * - Edit modal (see edit-modal.js)
 * - Import/export (see data-management.js)
 * - Cloud sync logic (see cloud-sync.js)
 * - Shared utilities (see common.js)
 */

/* global loadEntries, saveEntries, formatDate, formatTime */
/* global formatDuration, renderTimeEntries */
/* global openEditModal, exportToCSV */

// ── DOM References ──────────────────────────────────────────────────────────

// Data Viewer elements
const dvBody = document.getElementById("dv-body");
const dvEmptyMsg = document.getElementById("dv-empty-msg");

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
const dvDownloadSelectedBtn = document.getElementById("dv-download-selected-btn");
const dvDeleteSelectedBtn = document.getElementById("dv-delete-selected-btn");
const dvDeselectAllBtn = document.getElementById("dv-deselect-all-btn");
const dvSelectAllBtn = document.getElementById("dv-select-all-btn");

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
 * In week mode, returns the Monday and Sunday+1 of the current week (exclusive end).
 * In range mode, returns the custom range dates (inclusive end).
 * @returns {{start: Date, end: Date, exclusiveEnd: boolean}}
 */
function getCurrentViewRange() {
  if (viewMode === "range" && customRangeStart && customRangeEnd) {
    return {
      start: new Date(customRangeStart + "T00:00:00"),
      end: new Date(customRangeEnd + "T23:59:59.999"),
      exclusiveEnd: false
    };
  }
  // Default: current week (Monday to next Monday, exclusive upper bound)
  const end = new Date(currentWeekStart);
  end.setDate(end.getDate() + 7);
  return { start: new Date(currentWeekStart), end, exclusiveEnd: true };
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

dvDownloadSelectedBtn.addEventListener("click", () => exportToCSV());
dvDeleteSelectedBtn.addEventListener("click", deleteSelected);
dvDeselectAllBtn.addEventListener("click", clearSelection);

// ── Export for testing (Node.js environment) ───────────────────────────────

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    renderDataViewer,
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
