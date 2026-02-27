/**
 * tab-navigation.js — Tab & Sub-tab Navigation for Carrier Helper
 *
 * This file manages switching between the four main views
 * (Time Entries, Hours View, Data Viewer, About) and between
 * the Data Viewer sub-tabs (Time Entries, Meta Data).
 *
 * RESPONSIBILITIES:
 * - Main tab switching (showTab)
 * - Data Viewer sub-tab switching (showSubTab)
 * - Data Management collapse toggle
 * - Nav button event listeners
 *
 * DEPENDENCIES:
 * - common.js (must be loaded first)
 *
 * WHAT BELONGS HERE:
 * - All tab/view switching logic
 * - Navigation button event listeners
 *
 * WHAT DOES NOT BELONG HERE:
 * - View rendering logic (see individual view files)
 * - Import/export (see data-management.js)
 * - Edit modal (see edit-modal.js)
 */

/* global renderDataViewer, renderMetaDataForm, renderHoursView, clearSelection */

// ── DOM References ──────────────────────────────────────────────────────────

// Tab navigation
const navTimeEntries = document.getElementById("nav-time-entries");
const navDataViewer = document.getElementById("nav-data-viewer");
const navHoursView = document.getElementById("nav-hours-view");
const navAbout = document.getElementById("nav-about");
const timeEntriesView = document.getElementById("time-entries-view");
const dataViewerView = document.getElementById("data-viewer-view");
const hoursViewEl = document.getElementById("hours-view");
const aboutView = document.getElementById("about-view");

// Sub-tab navigation
const dvSubTimeEntries = document.getElementById("dv-sub-time-entries");
const dvSubMetaData = document.getElementById("dv-sub-meta-data");
const dvTimeEntriesSub = document.getElementById("dv-time-entries-sub");
const dvMetaDataSub = document.getElementById("dv-meta-data-sub");

// Data Management collapse
const dataMgmtBodyWrapper = document.getElementById("data-mgmt-body");
const dataMgmtToggleBtn = document.getElementById("data-mgmt-toggle");

/** Currently active data-viewer sub-tab: "time-entries" or "meta-data". */
let activeSubTab = "time-entries";

// ── Tab Navigation ──────────────────────────────────────────────────────────

/**
 * Switch between Time Entries, Hours View, Data Viewer, and About tabs.
 * @param {string} tab - "time-entries", "hours-view", "data-viewer", or "about"
 */
function showTab(tab) {
  // Clear any data-viewer selection when navigating away from it
  if (tab !== "data-viewer") {
    clearSelection();
  }

  if (tab === "data-viewer") {
    timeEntriesView.style.display = "none";
    hoursViewEl.style.display = "none";
    aboutView.style.display = "none";
    dataViewerView.style.display = "block";
    navTimeEntries.classList.remove("active");
    navHoursView.classList.remove("active");
    navAbout.classList.remove("active");
    navDataViewer.classList.add("active");
    if (activeSubTab === "meta-data") {
      if (typeof renderMetaDataForm === "function") renderMetaDataForm();
    } else {
      renderDataViewer();
    }
  } else if (tab === "hours-view") {
    timeEntriesView.style.display = "none";
    dataViewerView.style.display = "none";
    aboutView.style.display = "none";
    hoursViewEl.style.display = "block";
    navTimeEntries.classList.remove("active");
    navDataViewer.classList.remove("active");
    navAbout.classList.remove("active");
    navHoursView.classList.add("active");
    if (typeof renderHoursView === "function") renderHoursView();
  } else if (tab === "about") {
    timeEntriesView.style.display = "none";
    dataViewerView.style.display = "none";
    hoursViewEl.style.display = "none";
    aboutView.style.display = "block";
    navTimeEntries.classList.remove("active");
    navDataViewer.classList.remove("active");
    navHoursView.classList.remove("active");
    navAbout.classList.add("active");
  } else {
    dataViewerView.style.display = "none";
    hoursViewEl.style.display = "none";
    aboutView.style.display = "none";
    timeEntriesView.style.display = "block";
    navDataViewer.classList.remove("active");
    navHoursView.classList.remove("active");
    navAbout.classList.remove("active");
    navTimeEntries.classList.add("active");
  }
}

navTimeEntries.addEventListener("click", () => showTab("time-entries"));
navDataViewer.addEventListener("click", () => showTab("data-viewer"));
navHoursView.addEventListener("click", () => showTab("hours-view"));
navAbout.addEventListener("click", () => showTab("about"));

// ── Data Viewer Sub-tab Navigation ──────────────────────────────────────────

/**
 * Switch between Time Entries and Meta Data sub-tabs within the Data Viewer.
 * @param {string} subTab - "time-entries" or "meta-data"
 */
function showSubTab(subTab) {
  activeSubTab = subTab;
  if (subTab === "meta-data") {
    clearSelection();
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

// ── Export for testing (Node.js environment) ───────────────────────────────

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    showTab,
    showSubTab
  };
}
