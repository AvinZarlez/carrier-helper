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
 * - Clear all entries
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

// ── DOM References ──────────────────────────────────────────────────────────

const clockBtn = document.getElementById("clock-btn");
const statusValue = document.getElementById("status-value");
const currentTime = document.getElementById("current-time");
const entriesBody = document.getElementById("entries-body");
const emptyMsg = document.getElementById("empty-msg");
const clearBtn = document.getElementById("clear-btn");

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
 * Render the time entries table and update the clock button state.
 * This is the main render function for the Time Entries view.
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

  // Build table rows (newest first)
  const rows = [...entries].reverse();

  if (rows.length === 0) {
    entriesBody.innerHTML = "";
    emptyMsg.style.display = "block";
    return;
  }

  emptyMsg.style.display = "none";
  entriesBody.innerHTML = rows
    .map((entry, idx) => {
      const rowNum = rows.length - idx;
      const date = formatDate(entry.clockIn);
      const clockIn = formatTime(entry.clockIn);
      const clockOut = entry.clockOut
        ? formatTime(entry.clockOut)
        : `<span class="pending-cell">In progress…</span>`;
      const dur = formatDuration(entry.clockIn, entry.clockOut);
      const durCell = dur
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
    })
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

// Delete individual entry
entriesBody.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-delete-id]");
  if (!btn) return;
  if (!confirm("Delete this entry?")) return;
  const id = btn.dataset.deleteId;
  saveEntries(loadEntries().filter((e) => e.id !== id));
  renderTimeEntries();
  // Also refresh Data Viewer if it's visible
  if (typeof renderDataViewer === "function") {
    renderDataViewer();
  }
});

// Clear all entries
clearBtn.addEventListener("click", () => {
  if (!confirm("Clear all time entries? This cannot be undone.")) return;
  saveEntries([]);
  renderTimeEntries();
  // Also refresh Data Viewer if it's visible
  if (typeof renderDataViewer === "function") {
    renderDataViewer();
  }
});

// Clock button
clockBtn.addEventListener("click", handleClockButton);

// ── Initialization ──────────────────────────────────────────────────────────

/**
 * Initialize the Time Entries view.
 * Sets up the live clock and performs initial render.
 */
function initTimeEntriesView() {
  tickClock();
  setInterval(tickClock, 1000);
  renderTimeEntries();
}

// Alias for backward compatibility with cloud-sync.js
const render = renderTimeEntries;

// ── Export for testing (Node.js environment) ───────────────────────────────

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    handleClockButton,
    renderTimeEntries,
    tickClock,
    initTimeEntriesView
  };
}
