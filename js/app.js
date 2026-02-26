/**
 * app.js — Carrier Helper Application Bootstrap
 *
 * This is the main entry point that initializes the application.
 * It loads all view modules and starts the app.
 *
 * FILE STRUCTURE:
 * - js/common.js       — Shared utilities (storage, formatting, CSV)
 * - js/time-entries.js — Time Entries view (clock in/out, entries table)
 * - js/data-viewer.js  — Data Viewer view (export/import, read-only table)
 * - js/cloud-sync.js   — Firebase cloud sync module
 * - js/firebase-config.js — Firebase configuration
 *
 * LOAD ORDER (in index.html):
 * 1. common.js (shared utilities)
 * 2. time-entries.js (Time Entries view)
 * 3. data-viewer.js (Data Viewer view)
 * 4. app.js (this file - initialization)
 * 5. Firebase SDK (external)
 * 6. firebase-config.js
 * 7. cloud-sync.js
 *
 * WHAT BELONGS HERE:
 * - Application initialization
 * - Global error handling (if needed)
 * - Any cross-cutting concerns
 *
 * WHAT DOES NOT BELONG HERE:
 * - View-specific logic (use time-entries.js or data-viewer.js)
 * - Utility functions (use common.js)
 * - Cloud sync logic (use cloud-sync.js)
 */

/* global initTimeEntriesView */

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

  // Log successful initialization
  console.log("Carrier Helper initialized");
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
