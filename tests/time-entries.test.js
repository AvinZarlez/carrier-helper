/**
 * time-entries.test.js — Unit tests for time-entries.js
 *
 * Tests cover:
 * - getLastShiftEntry: returns the most recent completed entry
 * - getPreviousShiftsEntries: returns reference-day + most-recent-prior-day entries
 * - Same-day highlight deduplication: last shift should not be double-counted
 */

// ── Mock DOM elements required by time-entries.js at load time ──────────────

function mockElement() {
  return {
    style: { display: "" },
    textContent: "",
    className: "",
    innerHTML: "",
    addEventListener: jest.fn()
  };
}

const elementIds = [
  "clock-btn", "status-value", "current-time",
  "entries-body", "empty-msg", "current-shift-body",
  "current-shift-panel", "current-shift-title",
  "current-shift-body-wrapper", "previous-shifts-body-wrapper"
];

const elements = {};
elementIds.forEach((id) => { elements[id] = mockElement(); });
document.getElementById = jest.fn((id) => elements[id] || mockElement());

// ── Mock globals from common.js ────────────────────────────────────────────

global.loadEntries = jest.fn(() => []);
global.saveEntries = jest.fn();
global.getOpenEntry = jest.fn(() => null);
global.clockOutEntry = jest.fn();
global.createEntry = jest.fn();
global.formatDate = jest.fn(() => "");
global.formatTime = jest.fn(() => "");
global.formatDuration = jest.fn(() => "");
global.renderDataViewer = jest.fn();
global.openEditModal = jest.fn();

const {
  getLastShiftEntry,
  getPreviousShiftsEntries,
  toLocalDateString
} = require("../js/time-entries.js");

// ── Tests ────────────────────────────────────────────────────────────────────

describe("getLastShiftEntry", () => {
  it("returns null when there are no completed entries", () => {
    expect(getLastShiftEntry([])).toBeNull();
  });

  it("returns null when all entries are open (no clockOut)", () => {
    const entries = [
      { id: "1", clockIn: "2024-06-01T09:00:00.000Z", clockOut: null }
    ];
    expect(getLastShiftEntry(entries)).toBeNull();
  });

  it("returns the most recent completed entry", () => {
    const entries = [
      { id: "1", clockIn: "2024-06-01T09:00:00.000Z", clockOut: "2024-06-01T17:00:00.000Z" },
      { id: "2", clockIn: "2024-06-02T09:00:00.000Z", clockOut: "2024-06-02T17:00:00.000Z" }
    ];
    expect(getLastShiftEntry(entries)).toEqual(entries[1]);
  });
});

describe("getPreviousShiftsEntries", () => {
  it("returns empty array for no completed entries", () => {
    expect(getPreviousShiftsEntries([], null)).toEqual([]);
  });

  it("includes entries from reference day and prior day", () => {
    const entries = [
      { id: "1", clockIn: "2024-06-01T09:00:00.000Z", clockOut: "2024-06-01T17:00:00.000Z" },
      { id: "2", clockIn: "2024-06-02T09:00:00.000Z", clockOut: "2024-06-02T17:00:00.000Z" }
    ];
    const open = { id: "3", clockIn: "2024-06-02T20:00:00.000Z", clockOut: null };
    const result = getPreviousShiftsEntries(entries, open);
    expect(result.map((e) => e.id)).toEqual(["1", "2"]);
  });
});

describe("same-day highlight deduplication", () => {
  /**
   * Reproduce the exact duplicate-counting logic from renderTimeEntries()
   * to verify the fix prevents false highlights when last === previous entry.
   */
  function computeDuplicateDates(open, last, previous) {
    // This mirrors the fixed logic in renderTimeEntries()
    const allDisplayed = [];
    if (open) allDisplayed.push(open);
    else if (last && !previous.some((e) => e.id === last.id)) allDisplayed.push(last);
    allDisplayed.push(...previous);
    const dateCounts = {};
    allDisplayed.forEach((e) => {
      const dateStr = toLocalDateString(e.clockIn);
      dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
    });
    return new Set(
      Object.keys(dateCounts).filter((d) => dateCounts[d] > 1)
    );
  }

  it("does NOT highlight when last shift is the only entry on its date", () => {
    const entry = { id: "1", clockIn: "2024-06-02T09:00:00.000Z", clockOut: "2024-06-02T17:00:00.000Z" };
    // last is the same entry that appears in previous
    const last = entry;
    const previous = [entry];
    const duplicates = computeDuplicateDates(null, last, previous);
    expect(duplicates.size).toBe(0);
  });

  it("DOES highlight when there are genuinely two entries on the same date", () => {
    const entry1 = { id: "1", clockIn: "2024-06-02T06:00:00.000Z", clockOut: "2024-06-02T10:00:00.000Z" };
    const entry2 = { id: "2", clockIn: "2024-06-02T14:00:00.000Z", clockOut: "2024-06-02T18:00:00.000Z" };
    const last = entry2;
    const previous = [entry2, entry1];
    const duplicates = computeDuplicateDates(null, last, previous);
    const dateStr = toLocalDateString(entry1.clockIn);
    expect(duplicates.has(dateStr)).toBe(true);
  });

  it("does NOT highlight with open shift and single previous entry on different day", () => {
    const open = { id: "3", clockIn: "2024-06-03T09:00:00.000Z", clockOut: null };
    const entry = { id: "1", clockIn: "2024-06-02T09:00:00.000Z", clockOut: "2024-06-02T17:00:00.000Z" };
    const previous = [entry];
    const duplicates = computeDuplicateDates(open, null, previous);
    expect(duplicates.size).toBe(0);
  });

  it("DOES highlight with open shift and previous entry on same day", () => {
    const open = { id: "3", clockIn: "2024-06-02T20:00:00.000Z", clockOut: null };
    const entry = { id: "1", clockIn: "2024-06-02T09:00:00.000Z", clockOut: "2024-06-02T17:00:00.000Z" };
    const previous = [entry];
    const duplicates = computeDuplicateDates(open, null, previous);
    const dateStr = toLocalDateString(entry.clockIn);
    expect(duplicates.has(dateStr)).toBe(true);
  });
});
