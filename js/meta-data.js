/**
 * meta-data.js — Meta Data View for Carrier Helper
 *
 * This file manages the Meta Data sub-view within the Data Viewer,
 * allowing users to edit USPS pay scale settings.
 *
 * RESPONSIBILITIES:
 * - Render meta data form with current values
 * - Save meta data changes to localStorage (and cloud)
 * - Reset to default values
 * - Status messages on save
 *
 * DEPENDENCIES:
 * - common.js (must be loaded first for loadMetaData, saveMetaData, getDefaultMetaData)
 */

/* global loadMetaData, saveMetaData, getDefaultMetaData */

// ── DOM References ──────────────────────────────────────────────────────────

const metaSaveBtn = document.getElementById("meta-save-btn");
const metaResetBtn = document.getElementById("meta-reset-btn");
const metaSaveStatus = document.getElementById("meta-save-status");

/** All metadata field IDs, matching keys from getDefaultMetaData(). */
const META_FIELD_KEYS = [
  "baseHourlyRate",
  "overtimeMultiplier",
  "penaltyOvertimeMultiplier",
  "nightDifferentialRate",
  "sundayPremiumPercent",
  "dailyOvertimeThresholdHours",
  "dailyPenaltyOTThresholdHours",
  "weeklyOvertimeThresholdHours",
  "weeklyPenaltyOTThresholdHours",
  "nightDiffStartTime",
  "nightDiffEndTime"
];

// ── Render ──────────────────────────────────────────────────────────────────

/**
 * Populate the meta data form inputs from stored (or default) values.
 */
function renderMetaDataForm() {
  const meta = loadMetaData();
  META_FIELD_KEYS.forEach((key) => {
    const el = document.getElementById("meta-" + key);
    if (el) {
      el.value = meta[key] !== undefined ? meta[key] : "";
    }
  });
}

// ── Save ────────────────────────────────────────────────────────────────────

/**
 * Read form values and save metadata.
 */
function saveMetaDataForm() {
  const defaults = getDefaultMetaData();
  const numericKeys = new Set(
    Object.keys(defaults).filter((k) => typeof defaults[k] === "number")
  );
  const meta = {};
  META_FIELD_KEYS.forEach((key) => {
    const el = document.getElementById("meta-" + key);
    if (!el) return;
    if (numericKeys.has(key)) {
      const val = parseFloat(el.value);
      meta[key] = isNaN(val) ? defaults[key] : val;
    } else {
      meta[key] = el.value || defaults[key];
    }
  });

  saveMetaData(meta);
  showMetaSaveStatus("✅ Settings saved!", "success");
}

/**
 * Reset all fields to default values.
 */
function resetMetaDataForm() {
  const defaults = getDefaultMetaData();
  saveMetaData(defaults);
  renderMetaDataForm();
  showMetaSaveStatus("↩️ Reset to defaults.", "info");
}

/**
 * Show a temporary save status message.
 * @param {string} message - Message text
 * @param {string} type - "success" or "info"
 */
function showMetaSaveStatus(message, type) {
  if (!metaSaveStatus) return;
  metaSaveStatus.textContent = message;
  metaSaveStatus.className = "meta-save-status meta-save-" + type;
  metaSaveStatus.style.display = "block";
  clearTimeout(metaSaveStatus._timeout);
  metaSaveStatus._timeout = setTimeout(() => {
    metaSaveStatus.style.display = "none";
  }, 3000);
}

// ── Event Handlers ──────────────────────────────────────────────────────────

if (metaSaveBtn) {
  metaSaveBtn.addEventListener("click", saveMetaDataForm);
}

if (metaResetBtn) {
  metaResetBtn.addEventListener("click", () => {
    if (confirm("Reset all pay scale settings to USPS defaults?")) {
      resetMetaDataForm();
    }
  });
}

// ── Export for testing (Node.js environment) ───────────────────────────────

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    META_FIELD_KEYS,
    renderMetaDataForm,
    saveMetaDataForm,
    resetMetaDataForm
  };
}
