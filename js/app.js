/**
 * app.js — Carrier Helper Application Bootstrap
 *
 * This is the main entry point that initializes the application.
 * It loads all view modules and starts the app.
 *
 * FILE STRUCTURE:
 * - js/common.js          — Shared utilities (storage, formatting, CSV)
 * - js/time-entries.js    — Time Entries view (clock in/out, entries table)
 * - js/data-viewer.js     — Data Viewer view (read-only table, multi-select)
 * - js/edit-modal.js      — Edit Entry modal (shared by views)
 * - js/tab-navigation.js  — Tab switching and sub-tab navigation
 * - js/data-management.js — Data import/export/delete functionality
 * - js/meta-data.js       — Meta Data view (USPS pay scale settings form)
 * - js/hours-view.js      — Hours View (weekly/monthly/yearly summaries)
 * - js/cloud-sync.js      — Firebase cloud sync module
 * - js/firebase-config.js — Firebase configuration
 *
 * LOAD ORDER (in index.html):
 * 1. common.js (shared utilities)
 * 2. time-entries.js (Time Entries view)
 * 3. data-viewer.js (Data Viewer view)
 * 4. edit-modal.js (Edit Entry modal)
 * 5. tab-navigation.js (Tab switching)
 * 6. data-management.js (Import/export/delete)
 * 7. meta-data.js (Meta Data view)
 * 8. hours-view.js (Hours View)
 * 9. app.js (this file - initialization)
 * 10. Firebase SDK (external)
 * 11. firebase-config.js
 * 12. cloud-sync.js
 *
 * WHAT BELONGS HERE:
 * - Application initialization
 * - Global error handling (if needed)
 * - Any cross-cutting concerns
 *
 * WHAT DOES NOT BELONG HERE:
 * - View-specific logic (use the appropriate view file)
 * - Utility functions (use common.js)
 * - Cloud sync logic (use cloud-sync.js)
 */

/* global initTimeEntriesView, initHoursView, showTab */
/* global loadEntries, saveEntries, getOpenEntry, createEntry, clockOutEntry, renderTimeEntries */

// ── URL Parameter Handling ──────────────────────────────────────────────────

/**
 * Handle URL query parameters for automatic clock in/out on page load.
 *
 * - `?clock-in=true`  — Clocks in automatically if no shift is already in progress.
 * - `?clock-out=true` — Clocks out automatically if a shift is currently in progress.
 *
 * Either parameter does nothing when the precondition is not met (i.e. clocking
 * in while already clocked in, or clocking out while already clocked out).
 *
 * @param {string} [search] - URL search string to parse (defaults to
 *   `window.location.search`).  Pass an explicit value in tests.
 */
function handleUrlParams(search) {
  const params = new URLSearchParams(
    search !== undefined ? search : window.location.search
  );

  if (params.get("clock-in") === "true") {
    const entries = loadEntries();
    if (!getOpenEntry(entries)) {
      entries.push(createEntry());
      saveEntries(entries);
      renderTimeEntries();
    }
  } else if (params.get("clock-out") === "true") {
    const entries = loadEntries();
    const open = getOpenEntry(entries);
    if (open) {
      clockOutEntry(open);
      saveEntries(entries);
      renderTimeEntries();
    }
  }
}

// ── Page Navigation Parameter ───────────────────────────────────────────────

/**
 * Handle the `page` URL query parameter to navigate to a specific view on load.
 *
 * - `?page=hour`  — Opens the Hours View.
 * - `?page=data`  — Opens the Data Viewer.
 * - `?page=about` — Opens the About view.
 * - Any other value, or absent — Stays on the default Time Entries view.
 *
 * @param {string} [search] - URL search string to parse (defaults to
 *   `window.location.search`).  Pass an explicit value in tests.
 */
function handlePageParam(search) {
  const params = new URLSearchParams(
    search !== undefined ? search : window.location.search
  );

  const page = params.get("page");
  if (page === "hour") {
    showTab("hours-view");
  } else if (page === "data") {
    showTab("data-viewer");
  } else if (page === "about") {
    showTab("about");
  }
}

// ── About Page Dynamic URL ──────────────────────────────────────────────────

/**
 * Populate shortcut URL examples in the About page with the actual hosting URL.
 * @param {string} selector - CSS selector targeting the elements to fill.
 * @param {string} param - Query string to append (e.g. "?clock-in=true").
 */
function populateShortcutUrls(selector, param) {
  const base = window.location.origin + window.location.pathname;
  const url = base.replace(/\/$/, "") + "/" + param;
  document.querySelectorAll(selector).forEach(function (el) {
    el.textContent = url;
  });
}

// ── Application Initialization ──────────────────────────────────────────────

/**
 * Initialize the Carrier Helper application.
 * This is called when the DOM is ready.
 */
function initApp() {
  // Initialize the Time Entries view (primary view)
  if (typeof initTimeEntriesView === "function") {
    initTimeEntriesView();
  }

  // Initialize the Hours View
  if (typeof initHoursView === "function") {
    initHoursView();
  }

  // Handle any URL parameters for automatic clock in/out
  handleUrlParams();

  // Handle page parameter for initial view navigation
  handlePageParam();

  // Populate shortcut URL examples in the About page dynamically
  populateShortcutUrls(".js-shortcut-url-clock-in", "?clock-in=true");
  populateShortcutUrls(".js-shortcut-url-clock-out", "?clock-out=true");

  // Log successful initialization
  console.log("Carrier Helper initialized");
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

// ── Export for testing (Node.js environment) ───────────────────────────────

if (typeof module !== "undefined" && module.exports) {
  module.exports = { handleUrlParams, handlePageParam };
}
