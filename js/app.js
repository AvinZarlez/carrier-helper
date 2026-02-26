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

// ── Init ────────────────────────────────────────────────────────────────────

clockBtn.addEventListener("click", handleClockButton);
tickClock();
setInterval(tickClock, 1000);
render();
