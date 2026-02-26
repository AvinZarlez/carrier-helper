/**
 * app.js — Carrier Helper time-tracking logic
 *
 * Data is persisted in localStorage under the key "carrierHelperEntries".
 * Each entry is an object: { id, clockIn, clockOut }
 * where clockIn and clockOut are ISO-8601 timestamp strings (clockOut may be null).
 */

const STORAGE_KEY = "carrierHelperEntries";

// ── DOM references ──────────────────────────────────────────────────────────
const clockBtn    = document.getElementById("clock-btn");
const statusValue = document.getElementById("status-value");
const currentTime = document.getElementById("current-time");
const entriesBody = document.getElementById("entries-body");
const emptyMsg    = document.getElementById("empty-msg");
const clearBtn    = document.getElementById("clear-btn");

// Tab navigation
const navTimeEntries = document.getElementById("nav-time-entries");
const navDataViewer  = document.getElementById("nav-data-viewer");
const timeEntriesView = document.getElementById("time-entries-view");
const dataViewerView  = document.getElementById("data-viewer-view");

// Data Viewer DOM
const dvBody        = document.getElementById("dv-body");
const dvEmptyMsg    = document.getElementById("dv-empty-msg");
const exportBtn     = document.getElementById("export-btn");
const importAddBtn  = document.getElementById("import-add-btn");
const importReplaceBtn = document.getElementById("import-replace-btn");
const importFileInput  = document.getElementById("import-file-input");

// ── State ───────────────────────────────────────────────────────────────────

/** @returns {Array<{id: string, clockIn: string, clockOut: string|null}>} */
function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

/** @param {Array} entries */
function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  if (typeof CloudSyncModule !== "undefined" && CloudSyncModule.isLoggedIn()) {
    CloudSyncModule.notifyDataChanged();
  }
}

/** Returns the open entry (no clockOut), or null */
function getOpenEntry(entries) {
  return entries.find((e) => e.clockOut === null) || null;
}

// ── Clock logic ─────────────────────────────────────────────────────────────

function handleClockButton() {
  const entries  = loadEntries();
  const open     = getOpenEntry(entries);
  const now      = new Date().toISOString();

  if (open) {
    // Clock out
    open.clockOut = now;
  } else {
    // Clock in
    entries.push({ id: crypto.randomUUID(), clockIn: now, clockOut: null });
  }

  saveEntries(entries);
  render();
}

// ── Rendering ───────────────────────────────────────────────────────────────

function formatDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDuration(startIso, endIso) {
  if (!endIso) return null;
  const ms      = new Date(endIso) - new Date(startIso);
  const totalSec = Math.floor(ms / 1000);
  const h  = Math.floor(totalSec / 3600);
  const m  = Math.floor((totalSec % 3600) / 60);
  const s  = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function render() {
  const entries = loadEntries();
  const open    = getOpenEntry(entries);

  // Update button & status
  if (open) {
    clockBtn.textContent    = "Clock Out";
    clockBtn.className      = "btn btn-out";
    statusValue.textContent = "Clocked In";
    statusValue.className   = "status-in";
  } else {
    clockBtn.textContent    = "Clock In";
    clockBtn.className      = "btn btn-in";
    statusValue.textContent = "Clocked Out";
    statusValue.className   = "status-out";
  }

  // Build table rows (newest first)
  const rows = [...entries].reverse();

  if (rows.length === 0) {
    entriesBody.innerHTML = "";
    emptyMsg.style.display = "block";
    return;
  }

  emptyMsg.style.display = "none";
  entriesBody.innerHTML = rows.map((entry, idx) => {
    const rowNum   = rows.length - idx;
    const date     = formatDate(entry.clockIn);
    const clockIn  = formatTime(entry.clockIn);
    const clockOut = entry.clockOut ? formatTime(entry.clockOut) : `<span class="pending-cell">In progress…</span>`;
    const dur      = formatDuration(entry.clockIn, entry.clockOut);
    const durCell  = dur
      ? `<span class="duration-cell">${dur}</span>`
      : `<span class="pending-cell">—</span>`;

    return `
      <tr data-id="${entry.id}">
        <td>${rowNum}</td>
        <td>${date}</td>
        <td>${clockIn}</td>
        <td>${clockOut}</td>
        <td>${durCell}</td>
        <td>
          <button class="btn-delete" data-delete-id="${entry.id}" title="Delete entry">🗑</button>
        </td>
      </tr>`;
  }).join("");
}

// ── Delete individual entry ──────────────────────────────────────────────────

entriesBody.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-delete-id]");
  if (!btn) return;
  if (!confirm("Delete this entry?")) return;
  const id = btn.dataset.deleteId;
  saveEntries(loadEntries().filter((e) => e.id !== id));
  render();
});

// ── Clear all ───────────────────────────────────────────────────────────────

clearBtn.addEventListener("click", () => {
  if (!confirm("Clear all time entries? This cannot be undone.")) return;
  saveEntries([]);
  render();
});

// ── Live clock ──────────────────────────────────────────────────────────────

function tickClock() {
  currentTime.textContent = new Date().toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ── Tab navigation ──────────────────────────────────────────────────────────

function showTab(tab) {
  if (tab === "data-viewer") {
    timeEntriesView.style.display = "none";
    dataViewerView.style.display  = "block";
    navTimeEntries.classList.remove("active");
    navDataViewer.classList.add("active");
    renderDataViewer();
  } else {
    dataViewerView.style.display  = "none";
    timeEntriesView.style.display = "block";
    navDataViewer.classList.remove("active");
    navTimeEntries.classList.add("active");
  }
}

navTimeEntries.addEventListener("click", () => showTab("time-entries"));
navDataViewer.addEventListener("click",  () => showTab("data-viewer"));

// ── Data Viewer ─────────────────────────────────────────────────────────────

function renderDataViewer() {
  const entries = loadEntries();

  if (entries.length === 0) {
    dvBody.innerHTML = "";
    dvEmptyMsg.style.display = "block";
    return;
  }

  dvEmptyMsg.style.display = "none";
  dvBody.innerHTML = [...entries].reverse().map((entry, idx) => {
    const rowNum   = entries.length - idx;
    const date     = formatDate(entry.clockIn);
    const clockIn  = formatTime(entry.clockIn);
    const clockOut = entry.clockOut ? formatTime(entry.clockOut) : "—";
    const dur      = formatDuration(entry.clockIn, entry.clockOut) || "—";
    return `<tr>
      <td>${rowNum}</td>
      <td>${date}</td>
      <td>${clockIn}</td>
      <td>${clockOut}</td>
      <td>${dur}</td>
    </tr>`;
  }).join("");
}

// ── Export ───────────────────────────────────────────────────────────────────

function exportToCSV() {
  const entries = loadEntries();
  const header  = ["id", "date", "clockIn", "clockOut", "duration"];
  const rows    = entries.map((e) => [
    e.id,
    formatDate(e.clockIn),
    e.clockIn  || "",
    e.clockOut || "",
    formatDuration(e.clockIn, e.clockOut) || ""
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `carrier-helper-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

exportBtn.addEventListener("click", exportToCSV);

// ── Import ───────────────────────────────────────────────────────────────────

/**
 * Parse a CSV exported by this app into an array of entry objects.
 * Expected header: id, date, clockIn, clockOut, duration
 */
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Strip optional BOM
  const rawHeader = lines[0].replace(/^\uFEFF/, "");
  const headers   = rawHeader.split(",").map((h) => h.replace(/^"|"$/g, "").trim().toLowerCase());

  const idIdx      = headers.indexOf("id");
  const clockInIdx = headers.indexOf("clockin");
  const clockOutIdx= headers.indexOf("clockout");

  if (idIdx === -1 || clockInIdx === -1) return null; // Unrecognised format

  const entries = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const id       = cols[idIdx]       || "";
    const clockIn  = cols[clockInIdx]  || "";
    const clockOut = cols[clockOutIdx] || null;
    if (!id || !clockIn) continue;
    entries.push({ id, clockIn, clockOut: clockOut || null });
  }
  return entries;
}

/** Split a single CSV line respecting double-quoted fields. */
function splitCSVLine(line) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === "," && !inQuotes) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

/** Merge two arrays of entries, deduplicating by id. */
function mergeEntries(existing, incoming) {
  const map = new Map();
  existing.forEach((e) => map.set(e.id, e));
  incoming.forEach((e) => map.set(e.id, e));
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.clockIn) - new Date(b.clockIn)
  );
}

let importMode = null; // "add" | "replace"

importAddBtn.addEventListener("click", () => {
  importMode = "add";
  importFileInput.click();
});

importReplaceBtn.addEventListener("click", () => {
  importMode = "replace";
  importFileInput.click();
});

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
      if (!confirm(`Replace ALL ${loadEntries().length} existing entries with ${parsed.length} entries from the file? This cannot be undone.`)) {
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
    render();
    renderDataViewer();
    alert(`Import complete. ${loadEntries().length} entries now stored.`);
  };
  reader.readAsText(file);
});

// ── Init ────────────────────────────────────────────────────────────────────

clockBtn.addEventListener("click", handleClockButton);
tickClock();
setInterval(tickClock, 1000);
render();
