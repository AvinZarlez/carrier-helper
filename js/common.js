/**
 * common.js — Shared utilities for Carrier Helper
 *
 * This file contains all shared functionality used across the application:
 * - Storage operations (load/save entries to localStorage)
 * - Data formatting helpers (date, time, duration)
 * - CSV parsing and generation utilities
 * - Entry merge logic
 *
 * WHAT BELONGS HERE:
 * - Pure utility functions with no DOM dependencies
 * - Storage abstraction layer
 * - Data transformation and formatting
 * - Shared constants
 *
 * WHAT DOES NOT BELONG HERE:
 * - DOM manipulation
 * - Event handlers
 * - View-specific rendering logic
 */

/* global CloudSyncModule */

// ── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "carrierHelperEntries";
const META_STORAGE_KEY = "carrierHelperMetaData";

// ── Storage Operations ──────────────────────────────────────────────────────

/**
 * Load all time entries from localStorage.
 * @returns {Array<{id: string, clockIn: string, clockOut: string|null}>}
 */
function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

/**
 * Save entries to localStorage and notify cloud sync if logged in.
 * Entries are sorted by clockIn (oldest first) before saving.
 * @param {Array<{id: string, clockIn: string, clockOut: string|null}>} entries
 */
function saveEntries(entries) {
  const sorted = [...entries].sort((a, b) => new Date(a.clockIn) - new Date(b.clockIn));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  if (typeof CloudSyncModule !== "undefined" && CloudSyncModule.isLoggedIn()) {
    CloudSyncModule.notifyDataChanged();
  }
}

/**
 * Find the open entry (one without a clockOut time).
 * @param {Array} entries
 * @returns {Object|null} The open entry or null
 */
function getOpenEntry(entries) {
  return entries.find((e) => e.clockOut === null) || null;
}

// ── Meta Data Operations ────────────────────────────────────────────────────

/**
 * Return default USPS mail carrier pay scale metadata.
 *
 * Values are based on the NALC National Agreement for City Letter Carriers.
 * Verify rates against the current agreement at nalc.org.
 * - Base rate: Grade 1, Step BB career carrier (~$23.49/hr)
 * - Overtime: 1.5× base after 8 hrs/day or 40 hrs/week (per FLSA + NALC contract)
 * - Penalty overtime: 2× base after 10 hrs/day or 56 hrs/week
 * - Night differential: additional flat rate/hr for hours between 6 PM–6 AM
 * - Sunday premium: 25% of base rate for hours worked on Sunday
 *
 * @returns {Object} Default metadata object
 */
function getDefaultMetaData() {
  return {
    baseHourlyRate: 23.49,
    overtimeMultiplier: 1.5,
    penaltyOvertimeMultiplier: 2.0,
    nightDifferentialRate: 1.08,
    sundayPremiumPercent: 25,
    dailyOvertimeThresholdHours: 8,
    dailyPenaltyOTThresholdHours: 10,
    weeklyOvertimeThresholdHours: 40,
    weeklyPenaltyOTThresholdHours: 56,
    nightDiffStartTime: "18:00",
    nightDiffEndTime: "06:00"
  };
}

/**
 * Load metadata from localStorage, merging with defaults for any missing keys.
 * @returns {Object} Metadata object
 */
function loadMetaData() {
  const defaults = getDefaultMetaData();
  try {
    const stored = JSON.parse(localStorage.getItem(META_STORAGE_KEY));
    if (!stored || typeof stored !== "object") return defaults;
    return { ...defaults, ...stored };
  } catch {
    return defaults;
  }
}

/**
 * Save metadata to localStorage and notify cloud sync if logged in.
 * @param {Object} meta - Metadata object
 */
function saveMetaData(meta) {
  localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
  if (typeof CloudSyncModule !== "undefined" && CloudSyncModule.isLoggedIn()) {
    CloudSyncModule.notifyDataChanged();
  }
}

/**
 * Generate CSV content from metadata (key/value pairs).
 * Header row: "key","value"
 * @param {Object} meta - Metadata object
 * @returns {string} CSV string
 */
function generateMetaDataCSV(meta) {
  const header = ["key", "value"];
  const rows = Object.entries(meta).map(([k, v]) => [k, String(v)]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

/**
 * Parse a metadata CSV string into a metadata object.
 * Expected header: key, value
 * @param {string} text - Raw CSV text
 * @returns {Object|null} Parsed metadata or null if format is unrecognized
 */
function parseMetaDataCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return null;

  const rawHeader = lines[0].replace(/^\uFEFF/, "");
  const headers = rawHeader.split(",").map((h) => h.replace(/^"|"$/g, "").trim().toLowerCase());

  if (headers.indexOf("key") === -1 || headers.indexOf("value") === -1) return null;

  const keyIdx = headers.indexOf("key");
  const valIdx = headers.indexOf("value");
  const defaults = getDefaultMetaData();
  const numericKeys = new Set(Object.keys(defaults).filter((k) => typeof defaults[k] === "number"));
  const result = {};

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const key = cols[keyIdx] || "";
    const rawVal = cols[valIdx] || "";
    if (!key) continue;
    result[key] = numericKeys.has(key) ? Number(rawVal) : rawVal;
  }
  return result;
}

/**
 * Detect the type of a CSV string: "entries", "metadata", or "all".
 * @param {string} text - Raw CSV text
 * @returns {string} One of "entries", "metadata", "all", or "unknown"
 */
function detectCSVType(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 1) return "unknown";
  const rawHeader = lines[0].replace(/^\uFEFF/, "");
  const headers = rawHeader.split(",").map((h) => h.replace(/^"|"$/g, "").trim().toLowerCase());
  if (headers.indexOf("type") !== -1 && headers.indexOf("key") !== -1 && headers.indexOf("value") !== -1) {
    return "all";
  }
  if (headers.indexOf("key") !== -1 && headers.indexOf("value") !== -1) {
    return "metadata";
  }
  if (headers.indexOf("id") !== -1 && headers.indexOf("clockin") !== -1) {
    return "entries";
  }
  return "unknown";
}

/**
 * Generate a combined CSV with both time entries and metadata.
 * Uses columns: type, key, value, id, date, clockIn, clockOut, duration, notes
 * Metadata rows have type="meta", entry rows have type="entry".
 * @param {Array} entries - Time entries array
 * @param {Object} meta - Metadata object
 * @returns {string} CSV string
 */
function generateAllDataCSV(entries, meta) {
  const header = ["type", "key", "value", "id", "date", "clockIn", "clockOut", "duration", "notes"];
  const metaRows = Object.entries(meta).map(([k, v]) =>
    ["meta", k, String(v), "", "", "", "", "", ""]
  );
  const entryRows = entries.map((e) => [
    "entry", "", "",
    e.id,
    formatDate(e.clockIn),
    e.clockIn || "",
    e.clockOut || "",
    formatDuration(e.clockIn, e.clockOut) || "",
    e.notes || ""
  ]);
  return [header, ...metaRows, ...entryRows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

/**
 * Parse a combined "all data" CSV into entries and metadata.
 * @param {string} text - Raw CSV text
 * @returns {{entries: Array, meta: Object}|null} Parsed data or null if invalid
 */
function parseAllDataCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return null;

  const rawHeader = lines[0].replace(/^\uFEFF/, "");
  const headers = rawHeader.split(",").map((h) => h.replace(/^"|"$/g, "").trim().toLowerCase());

  const typeIdx = headers.indexOf("type");
  const keyIdx = headers.indexOf("key");
  const valIdx = headers.indexOf("value");
  const idIdx = headers.indexOf("id");
  const clockInIdx = headers.indexOf("clockin");
  const clockOutIdx = headers.indexOf("clockout");
  const notesIdx = headers.indexOf("notes");

  if (typeIdx === -1) return null;

  const defaults = getDefaultMetaData();
  const numericKeys = new Set(Object.keys(defaults).filter((k) => typeof defaults[k] === "number"));
  const meta = {};
  const entries = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const type = (cols[typeIdx] || "").trim().toLowerCase();

    if (type === "meta") {
      const key = cols[keyIdx] || "";
      const rawVal = cols[valIdx] || "";
      if (key) {
        meta[key] = numericKeys.has(key) ? Number(rawVal) : rawVal;
      }
    } else if (type === "entry") {
      const id = idIdx !== -1 ? (cols[idIdx] || "") : "";
      const clockIn = clockInIdx !== -1 ? (cols[clockInIdx] || "") : "";
      const clockOut = clockOutIdx !== -1 ? (cols[clockOutIdx] || null) : null;
      const notes = notesIdx !== -1 ? (cols[notesIdx] || "") : "";
      if (id && clockIn) {
        entries.push({ id, clockIn, clockOut: clockOut || null, notes });
      }
    }
  }

  return { entries, meta };
}

// ── Formatting Helpers ──────────────────────────────────────────────────────

/**
 * Format an ISO timestamp as a human-readable date.
 * @param {string} isoString - ISO-8601 timestamp
 * @returns {string} Formatted date string (e.g., "Feb 26, 2026")
 */
function formatDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Format an ISO timestamp as a human-readable time.
 * @param {string} isoString - ISO-8601 timestamp
 * @returns {string} Formatted time string (e.g., "09:30:15 AM")
 */
function formatTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/**
 * Calculate and format duration between two timestamps.
 * @param {string} startIso - Start ISO-8601 timestamp
 * @param {string} endIso - End ISO-8601 timestamp
 * @returns {string|null} Duration string (e.g., "08:30:00") or null if incomplete
 */
function formatDuration(startIso, endIso) {
  if (!endIso) return null;
  const ms = new Date(endIso) - new Date(startIso);
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── CSV Utilities ───────────────────────────────────────────────────────────

/**
 * Parse a CSV string into an array of entry objects.
 * Expected header: id, date, clockIn, clockOut, duration
 * @param {string} text - Raw CSV text
 * @returns {Array|null} Parsed entries or null if format is unrecognized
 */
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Strip optional BOM
  const rawHeader = lines[0].replace(/^\uFEFF/, "");
  const headers = rawHeader.split(",").map((h) => h.replace(/^"|"$/g, "").trim().toLowerCase());

  const idIdx = headers.indexOf("id");
  const clockInIdx = headers.indexOf("clockin");
  const clockOutIdx = headers.indexOf("clockout");
  const notesIdx = headers.indexOf("notes");

  if (idIdx === -1 || clockInIdx === -1) return null; // Unrecognized format

  const entries = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const id = cols[idIdx] || "";
    const clockIn = cols[clockInIdx] || "";
    const clockOut = cols[clockOutIdx] || null;
    const notes = notesIdx !== -1 ? (cols[notesIdx] || "") : "";
    if (!id || !clockIn) continue;
    entries.push({ id, clockIn, clockOut: clockOut || null, notes });
  }
  return entries;
}

/**
 * Split a single CSV line respecting double-quoted fields.
 * @param {string} line - A single CSV row
 * @returns {Array<string>} Array of column values
 */
function splitCSVLine(line) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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

/**
 * Generate CSV content from entries.
 * @param {Array} entries - Array of entry objects
 * @returns {string} CSV string
 */
function generateCSV(entries) {
  const header = ["id", "date", "clockIn", "clockOut", "duration", "notes"];
  const rows = entries.map((e) => [
    e.id,
    formatDate(e.clockIn),
    e.clockIn || "",
    e.clockOut || "",
    formatDuration(e.clockIn, e.clockOut) || "",
    e.notes || ""
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

// ── Entry Operations ────────────────────────────────────────────────────────

/**
 * Merge two arrays of entries, deduplicating by id.
 * Incoming entries take precedence over existing ones with the same id.
 * @param {Array} existing - Current entries
 * @param {Array} incoming - New entries to merge
 * @returns {Array} Merged and sorted entries
 */
function mergeEntries(existing, incoming) {
  const map = new Map();
  existing.forEach((e) => map.set(e.id, e));
  incoming.forEach((e) => map.set(e.id, e));
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.clockIn) - new Date(b.clockIn)
  );
}

/**
 * Validate a time entry object.
 * Checks that required fields are present and have sensible values.
 * @param {Object} entry
 * @returns {boolean} true if the entry is valid
 */
function validateEntry(entry) {
  if (!entry || typeof entry.id !== "string" || !entry.id) return false;
  const clockInDate = new Date(entry.clockIn);
  if (!entry.clockIn || isNaN(clockInDate.getTime())) return false;
  if (entry.notes !== undefined && typeof entry.notes !== "string") return false;
  if (entry.clockOut) {
    const clockOutDate = new Date(entry.clockOut);
    if (isNaN(clockOutDate.getTime())) return false;
    if (clockOutDate <= clockInDate) return false;
  }
  return true;
}

/**
 * Validate that a time entry does not overlap with any other entries.
 * An open entry (no clockOut) is treated as extending to the present/infinity.
 * @param {Object} entry - The entry to check
 * @param {Array} allEntries - All entries (may include the entry itself; it is excluded internally)
 * @returns {boolean} true if no overlap is detected
 */
function validateNoOverlap(entry, allEntries) {
  const others = allEntries.filter((e) => e.id !== entry.id);
  const entryStart = new Date(entry.clockIn);
  const entryEnd = entry.clockOut ? new Date(entry.clockOut) : null;

  for (const other of others) {
    const otherStart = new Date(other.clockIn);
    const otherEnd = other.clockOut ? new Date(other.clockOut) : null;

    // Overlap exists when each interval starts before the other ends.
    // A null end means open-ended (extends forever).
    // Strict inequality (<) is intentional: entries that merely touch at a
    // boundary (e.g., one ends at 10:00, the next starts at 10:00) are
    // considered adjacent, not overlapping.
    const entryStartsBeforeOtherEnds = !otherEnd || entryStart < otherEnd;
    const otherStartsBeforeEntryEnds = !entryEnd || otherStart < entryEnd;

    if (entryStartsBeforeOtherEnds && otherStartsBeforeEntryEnds) {
      return false;
    }
  }
  return true;
}

/**
 * Validate that there is at most one open (in-progress) entry, and if this
 * entry is open it must be the chronologically last entry in the dataset.
 * @param {Object} entry - The entry to check
 * @param {Array} allEntries - All entries (may include the entry itself; it is excluded internally)
 * @returns {boolean} true if the single-open constraint is satisfied
 */
function validateSingleOpenEntry(entry, allEntries) {
  // If this entry has a clockOut it is complete; no constraint violated.
  if (entry.clockOut) return true;

  // Entry is open. There must be no other entries with a clockIn after this one.
  const entryStart = new Date(entry.clockIn);
  const others = allEntries.filter((e) => e.id !== entry.id);
  for (const other of others) {
    if (new Date(other.clockIn) > entryStart) {
      return false;
    }
  }
  return true;
}

/**
 * Create a new entry with a unique ID and current timestamp.
 * @returns {Object} New entry object with clockIn set to now
 */
/**
 * Filter entries to those whose clockIn falls within a date range.
 * @param {Array} entries - Time entries array
 * @param {Date} viewStart - Start of range (inclusive)
 * @param {Date} viewEnd - End of range
 * @param {boolean} [exclusiveEnd=false] - When true, the end bound is exclusive (d < viewEnd)
 * @returns {Array} Filtered entries
 */
function filterEntriesByRange(entries, viewStart, viewEnd, exclusiveEnd) {
  return entries.filter((e) => {
    const d = new Date(e.clockIn);
    return exclusiveEnd ? (d >= viewStart && d < viewEnd) : (d >= viewStart && d <= viewEnd);
  });
}

/**
 * Get entries to export: if any entries are selected, return only those;
 * otherwise return all entries within the view date range.
 * @param {Array} entries - All time entries
 * @param {Set|Array|null} selectedIds - Selected entry IDs (Set, array, or null/empty)
 * @param {Date} viewStart - Start of view range (inclusive)
 * @param {Date} viewEnd - End of view range
 * @param {boolean} [exclusiveEnd=false] - Whether the end bound is exclusive
 * @returns {Array} Entries to export
 */
function getExportEntries(entries, selectedIds, viewStart, viewEnd, exclusiveEnd) {
  const idSet = selectedIds instanceof Set ? selectedIds : new Set(selectedIds || []);
  if (idSet.size > 0) {
    return entries.filter((e) => idSet.has(e.id));
  }
  return filterEntriesByRange(entries, viewStart, viewEnd, exclusiveEnd);
}

function createEntry() {
  return {
    id: crypto.randomUUID(),
    clockIn: new Date().toISOString(),
    clockOut: null,
    notes: ""
  };
}

// ── Hours / Pay Calculation Utilities ──────────────────────────────────────

/**
 * Convert an ISO timestamp to a local date string (YYYY-MM-DD).
 * @param {string} isoString - ISO-8601 timestamp
 * @returns {string} Date string in YYYY-MM-DD format (local time)
 */
function toLocalDateString(isoString) {
  return new Date(isoString).toLocaleDateString("en-CA");
}

/**
 * Get the duration of a completed shift in decimal hours.
 * @param {Object} entry - Time entry with clockIn and clockOut
 * @returns {number} Duration in hours (0 if clockOut is null/missing)
 */
function getShiftHours(entry) {
  if (!entry.clockOut) return 0;
  return (new Date(entry.clockOut) - new Date(entry.clockIn)) / 3600000;
}

/**
 * Calculate how many hours of a shift fall within the night differential window.
 * The window may wrap midnight (e.g., 18:00–06:00).
 * @param {Object} entry - Time entry with clockIn and clockOut
 * @param {Object} meta - Metadata with nightDiffStartTime and nightDiffEndTime
 * @returns {number} Hours within the night differential window
 */
function calculateNightDiffHours(entry, meta) {
  if (!entry.clockOut) return 0;
  const shiftStart = new Date(entry.clockIn);
  const shiftEnd = new Date(entry.clockOut);
  const [nightStartH, nightStartM] = meta.nightDiffStartTime.split(":").map(Number);
  const [nightEndH, nightEndM] = meta.nightDiffEndTime.split(":").map(Number);
  const wraps = (nightStartH * 60 + nightStartM) > (nightEndH * 60 + nightEndM);

  let totalNightMs = 0;
  const startDay = new Date(shiftStart);
  startDay.setHours(0, 0, 0, 0);

  for (let day = new Date(startDay); day.getTime() <= shiftEnd.getTime(); day.setDate(day.getDate() + 1)) {
    const y = day.getFullYear();
    const mo = day.getMonth();
    const d = day.getDate();

    if (wraps) {
      // Evening segment: [nightStart on day d, midnight of day d+1)
      const seg1Start = new Date(y, mo, d, nightStartH, nightStartM, 0, 0);
      const seg1End = new Date(y, mo, d + 1, 0, 0, 0, 0);
      totalNightMs += Math.max(0, Math.min(shiftEnd, seg1End) - Math.max(shiftStart, seg1Start));
      // Morning segment: [midnight on day d, nightEnd on day d)
      const seg2Start = new Date(y, mo, d, 0, 0, 0, 0);
      const seg2End = new Date(y, mo, d, nightEndH, nightEndM, 0, 0);
      totalNightMs += Math.max(0, Math.min(shiftEnd, seg2End) - Math.max(shiftStart, seg2Start));
    } else {
      const segStart = new Date(y, mo, d, nightStartH, nightStartM, 0, 0);
      const segEnd = new Date(y, mo, d, nightEndH, nightEndM, 0, 0);
      totalNightMs += Math.max(0, Math.min(shiftEnd, segEnd) - Math.max(shiftStart, segStart));
    }
  }

  return totalNightMs / 3600000;
}

/**
 * Calculate how many hours of a shift fall on a Sunday (local time).
 * @param {Object} entry - Time entry with clockIn and clockOut
 * @returns {number} Hours on Sunday
 */
function calculateSundayHours(entry) {
  if (!entry.clockOut) return 0;
  const shiftStart = new Date(entry.clockIn);
  const shiftEnd = new Date(entry.clockOut);
  let totalSundayMs = 0;

  const startDay = new Date(shiftStart);
  startDay.setHours(0, 0, 0, 0);

  for (let day = new Date(startDay); day.getTime() <= shiftEnd.getTime(); day.setDate(day.getDate() + 1)) {
    if (day.getDay() === 0) { // Sunday = 0
      const y = day.getFullYear();
      const mo = day.getMonth();
      const d = day.getDate();
      const dayStart = new Date(y, mo, d, 0, 0, 0, 0);
      const dayEnd = new Date(y, mo, d + 1, 0, 0, 0, 0);
      totalSundayMs += Math.max(0, Math.min(shiftEnd, dayEnd) - Math.max(shiftStart, dayStart));
    }
  }

  return totalSundayMs / 3600000;
}

/**
 * Calculate a pay breakdown for a set of time entries.
 * Applies daily and weekly overtime/penalty overtime thresholds.
 * Open entries (without a clockOut) are excluded from calculations.
 * @param {Array} entries - Time entries (typically one work week)
 * @param {Object} meta - Metadata with pay rates and thresholds
 * @returns {Object} Breakdown: baseHours, otHours, penaltyOTHours, nightDiffHours,
 *   sundayHours, totalHours, basePay, otPay, penaltyOTPay, nightDiffPay,
 *   sundayPremiumPay, estimatedPay
 */
function calculatePaySummary(entries, meta) {
  const {
    baseHourlyRate,
    overtimeMultiplier,
    penaltyOvertimeMultiplier,
    nightDifferentialRate,
    sundayPremiumPercent,
    dailyOvertimeThresholdHours,
    dailyPenaltyOTThresholdHours,
    weeklyOvertimeThresholdHours,
    weeklyPenaltyOTThresholdHours
  } = meta;

  // Group completed entries by local date
  const dayMap = new Map();
  entries.filter((e) => e.clockOut).forEach((entry) => {
    const day = toLocalDateString(entry.clockIn);
    if (!dayMap.has(day)) dayMap.set(day, []);
    dayMap.get(day).push(entry);
  });

  let baseHours = 0;
  let otHours = 0;
  let penaltyOTHours = 0;
  let nightDiffHours = 0;
  let sundayHours = 0;

  for (const dayEntries of dayMap.values()) {
    const totalDayHours = dayEntries.reduce((sum, e) => sum + getShiftHours(e), 0);
    baseHours += Math.min(totalDayHours, dailyOvertimeThresholdHours);
    otHours += Math.max(0, Math.min(totalDayHours, dailyPenaltyOTThresholdHours) - dailyOvertimeThresholdHours);
    penaltyOTHours += Math.max(0, totalDayHours - dailyPenaltyOTThresholdHours);
    dayEntries.forEach((e) => {
      nightDiffHours += calculateNightDiffHours(e, meta);
      sundayHours += calculateSundayHours(e);
    });
  }

  // Apply weekly OT adjustment: move excess base hours to OT
  if (baseHours > weeklyOvertimeThresholdHours) {
    const spillover = baseHours - weeklyOvertimeThresholdHours;
    baseHours = weeklyOvertimeThresholdHours;
    otHours += spillover;
  }

  // Apply weekly penalty OT adjustment: move excess OT hours to penalty OT
  if (baseHours + otHours > weeklyPenaltyOTThresholdHours) {
    const spillover = (baseHours + otHours) - weeklyPenaltyOTThresholdHours;
    otHours -= spillover;
    penaltyOTHours += spillover;
  }

  const totalHours = baseHours + otHours + penaltyOTHours;
  const basePay = baseHours * baseHourlyRate;
  const otPay = otHours * baseHourlyRate * overtimeMultiplier;
  const penaltyOTPay = penaltyOTHours * baseHourlyRate * penaltyOvertimeMultiplier;
  const nightDiffPay = nightDiffHours * nightDifferentialRate;
  const sundayPremiumPay = sundayHours * baseHourlyRate * (sundayPremiumPercent / 100);

  return {
    totalHours,
    baseHours,
    otHours,
    penaltyOTHours,
    nightDiffHours,
    sundayHours,
    basePay,
    otPay,
    penaltyOTPay,
    nightDiffPay,
    sundayPremiumPay,
    estimatedPay: basePay + otPay + penaltyOTPay + nightDiffPay + sundayPremiumPay
  };
}

/**
 * Clock out an entry by setting its clockOut to now.
 * @param {Object} entry - The entry to clock out
 */
function clockOutEntry(entry) {
  entry.clockOut = new Date().toISOString();
}

// ── Export for testing (Node.js environment) ───────────────────────────────

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    STORAGE_KEY,
    META_STORAGE_KEY,
    loadEntries,
    saveEntries,
    getOpenEntry,
    getDefaultMetaData,
    loadMetaData,
    saveMetaData,
    generateMetaDataCSV,
    parseMetaDataCSV,
    detectCSVType,
    generateAllDataCSV,
    parseAllDataCSV,
    formatDate,
    formatTime,
    formatDuration,
    parseCSV,
    splitCSVLine,
    generateCSV,
    mergeEntries,
    validateEntry,
    validateNoOverlap,
    validateSingleOpenEntry,
    filterEntriesByRange,
    getExportEntries,
    createEntry,
    clockOutEntry,
    toLocalDateString,
    getShiftHours,
    calculateNightDiffHours,
    calculateSundayHours,
    calculatePaySummary
  };
}
