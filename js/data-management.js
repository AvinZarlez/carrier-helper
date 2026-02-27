/**
 * data-management.js — Data Import/Export/Delete for Carrier Helper
 *
 * This file manages all data management operations: exporting time entries
 * and metadata as CSV files, importing CSV files (both add/merge and replace
 * modes), and deleting all local data.
 *
 * RESPONSIBILITIES:
 * - Export time entries, metadata, and combined CSV files
 * - Export entries within a custom date range
 * - Import CSV files with auto-detection (entries, metadata, or combined)
 * - Delete all local time entry data
 *
 * DEPENDENCIES:
 * - common.js (must be loaded first for CSV utilities, storage, mergeEntries)
 * - data-viewer.js (for getCurrentViewRange, dateToInputValue, selectedEntryIds)
 *
 * WHAT BELONGS HERE:
 * - Export button handlers and CSV generation/download
 * - Import button handlers, file reading, and data merging
 * - Delete all data handler
 *
 * WHAT DOES NOT BELONG HERE:
 * - Table rendering (see data-viewer.js)
 * - Tab navigation (see tab-navigation.js)
 * - Edit modal (see edit-modal.js)
 */

/* global loadEntries, saveEntries, mergeEntries, generateCSV, parseCSV */
/* global loadMetaData, saveMetaData, generateMetaDataCSV, parseMetaDataCSV */
/* global detectCSVType, generateAllDataCSV, parseAllDataCSV */
/* global getExportEntries, renderTimeEntries, renderMetaDataForm */
/* global renderDataViewer, getCurrentViewRange, dateToInputValue, selectedEntryIds */

// ── DOM References ──────────────────────────────────────────────────────────

const exportBtn = document.getElementById("export-btn");
const exportRangeBtn = document.getElementById("export-range-btn");
const exportRangeForm = document.getElementById("export-range-form");
const exportRangeStartEl = document.getElementById("export-range-start");
const exportRangeEndEl = document.getElementById("export-range-end");
const exportRangeConfirmBtn = document.getElementById("export-range-confirm-btn");
const exportRangeCancelBtn = document.getElementById("export-range-cancel-btn");
const exportAllBtn = document.getElementById("export-all-btn");
const exportMetaDataBtn = document.getElementById("export-metadata-btn");
const importAddBtn = document.getElementById("import-add-btn");
const importReplaceBtn = document.getElementById("import-replace-btn");
const importFileInput = document.getElementById("import-file-input");
const deleteAllBtn = document.getElementById("delete-all-btn");

// ── Export ──────────────────────────────────────────────────────────────────

/**
 * Export time entries for the current view as CSV.
 * If entries are selected, exports only those. Otherwise exports all entries
 * visible in the current date view (week or custom range).
 * Entries outside the current view range are never included.
 */
function exportToCSV() {
  const range = getCurrentViewRange();
  // Determine whether the end is exclusive (week mode) or inclusive (range mode)
  const exclusiveEnd = !(range.end.getHours() === 23 && range.end.getMinutes() === 59);

  const entries = getExportEntries(loadEntries(), selectedEntryIds, range.start, range.end, exclusiveEnd);
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
    exportToCSV,
    exportMetaDataToCSV,
    exportAllDataToCSV,
    exportRangeToCSV
  };
}
