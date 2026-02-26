/**
 * data-viewer.js — Data Viewer View for Carrier Helper
 *
 * This file manages the Data Viewer view which provides a read-only
 * spreadsheet view of all entries and data import/export functionality.
 *
 * RESPONSIBILITIES:
 * - Data Viewer table rendering
 * - Export to CSV functionality
 * - Import from CSV (both modes: add/merge and replace)
 * - Tab navigation between views
 *
 * DEPENDENCIES:
 * - common.js (must be loaded first for shared utilities)
 *
 * WHAT BELONGS HERE:
 * - All DOM manipulation for the Data Viewer view
 * - Import/export event handlers
 * - Tab switching logic
 * - CSV file handling
 *
 * WHAT DOES NOT BELONG HERE:
 * - Time Entries specific logic (see time-entries.js)
 * - Cloud sync logic (see cloud-sync.js)
 * - Shared utilities (see common.js)
 */

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
 * Shows a read-only view without action buttons.
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
      return `<tr>
      <td>${rowNum}</td>
      <td>${date}</td>
      <td>${clockIn}</td>
      <td>${clockOut}</td>
      <td>${dur}</td>
    </tr>`;
    })
    .join("");
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
    exportToCSV
  };
}
