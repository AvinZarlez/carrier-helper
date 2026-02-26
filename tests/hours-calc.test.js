/**
 * hours-calc.test.js — Unit tests for hours and pay calculation utilities in common.js
 *
 * Tests cover:
 * - toLocalDateString
 * - getShiftHours
 * - calculateNightDiffHours
 * - calculateSundayHours
 * - calculatePaySummary
 */

const {
  getDefaultMetaData,
  toLocalDateString,
  getShiftHours,
  calculateNightDiffHours,
  calculateSundayHours,
  calculatePaySummary
} = require("../js/common.js");

// ── toLocalDateString ──────────────────────────────────────────────────────

describe("toLocalDateString", () => {
  it("returns a YYYY-MM-DD string", () => {
    const result = toLocalDateString("2026-02-26T12:00:00.000Z");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ── getShiftHours ──────────────────────────────────────────────────────────

describe("getShiftHours", () => {
  it("returns 0 for an open entry", () => {
    expect(getShiftHours({ clockIn: "2026-02-26T09:00:00.000Z", clockOut: null })).toBe(0);
  });

  it("calculates 8 hours for a standard day shift", () => {
    const entry = {
      clockIn: "2026-02-26T09:00:00.000Z",
      clockOut: "2026-02-26T17:00:00.000Z"
    };
    expect(getShiftHours(entry)).toBeCloseTo(8, 5);
  });

  it("calculates fractional hours correctly", () => {
    const entry = {
      clockIn: "2026-02-26T09:00:00.000Z",
      clockOut: "2026-02-26T09:30:00.000Z"
    };
    expect(getShiftHours(entry)).toBeCloseTo(0.5, 5);
  });
});

// ── calculateNightDiffHours ────────────────────────────────────────────────

describe("calculateNightDiffHours", () => {
  const meta = getDefaultMetaData(); // nightDiffStartTime: "18:00", nightDiffEndTime: "06:00"

  it("returns 0 for an open entry", () => {
    const entry = { clockIn: "2026-02-26T23:00:00Z", clockOut: null };
    expect(calculateNightDiffHours(entry, meta)).toBe(0);
  });

  it("returns 0 for a daytime shift outside night window", () => {
    // 09:00–17:00 local — use a fixed UTC offset representation
    // Create a shift entirely in daytime: noon to 5 PM local
    // We use a date constructed in local time to avoid timezone ambiguity
    const date = new Date(2026, 1, 26); // Feb 26 2026 local midnight
    const clockIn = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0, 0, 0).toISOString();
    const clockOut = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17, 0, 0, 0).toISOString();
    expect(calculateNightDiffHours({ clockIn, clockOut }, meta)).toBeCloseTo(0, 5);
  });

  it("returns full shift hours when entirely within night window (evening)", () => {
    // 19:00–23:00 local (4 hours, all within 18:00–06:00 window)
    const date = new Date(2026, 1, 26);
    const clockIn = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 19, 0, 0, 0).toISOString();
    const clockOut = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 0, 0, 0).toISOString();
    expect(calculateNightDiffHours({ clockIn, clockOut }, meta)).toBeCloseTo(4, 5);
  });

  it("returns full shift hours when entirely within night window (early morning)", () => {
    // 01:00–05:00 local (4 hours, all within 18:00–06:00 window)
    const date = new Date(2026, 1, 26);
    const clockIn = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 1, 0, 0, 0).toISOString();
    const clockOut = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 5, 0, 0, 0).toISOString();
    expect(calculateNightDiffHours({ clockIn, clockOut }, meta)).toBeCloseTo(4, 5);
  });

  it("returns partial hours for a shift that spans day and night", () => {
    // 17:00–19:00 local: only 18:00–19:00 is in night window = 1 hour
    const date = new Date(2026, 1, 26);
    const clockIn = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17, 0, 0, 0).toISOString();
    const clockOut = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 19, 0, 0, 0).toISOString();
    expect(calculateNightDiffHours({ clockIn, clockOut }, meta)).toBeCloseTo(1, 5);
  });

  it("counts both evening and morning segments for an overnight shift", () => {
    // 18:00 to 06:00 next day = 12 hours of night diff
    const date = new Date(2026, 1, 26);
    const clockIn = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 18, 0, 0, 0).toISOString();
    const clockOut = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 6, 0, 0, 0).toISOString();
    expect(calculateNightDiffHours({ clockIn, clockOut }, meta)).toBeCloseTo(12, 5);
  });

  it("handles a non-wrapping night window correctly", () => {
    // Window 02:00–10:00 (non-wrapping)
    const customMeta = { ...meta, nightDiffStartTime: "02:00", nightDiffEndTime: "10:00" };
    const date = new Date(2026, 1, 26);
    const clockIn = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).toISOString();
    const clockOut = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0).toISOString();
    // 02:00–10:00 = 8 hours of night diff
    expect(calculateNightDiffHours({ clockIn, clockOut }, customMeta)).toBeCloseTo(8, 5);
  });
});

// ── calculateSundayHours ───────────────────────────────────────────────────

describe("calculateSundayHours", () => {
  it("returns 0 for an open entry", () => {
    expect(calculateSundayHours({ clockIn: "2026-02-22T09:00:00.000Z", clockOut: null })).toBe(0);
  });

  it("returns 0 for a weekday shift (Monday–Saturday)", () => {
    // Monday Feb 23 2026 (day-of-week = 1)
    const date = new Date(2026, 1, 23); // Mon
    const clockIn = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0, 0, 0).toISOString();
    const clockOut = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17, 0, 0, 0).toISOString();
    expect(calculateSundayHours({ clockIn, clockOut })).toBeCloseTo(0, 5);
  });

  it("returns total shift hours for a Sunday shift", () => {
    // Sunday Mar 1 2026 (day-of-week = 0)
    const date = new Date(2026, 2, 1); // Sun
    const clockIn = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0, 0, 0).toISOString();
    const clockOut = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17, 0, 0, 0).toISOString();
    expect(calculateSundayHours({ clockIn, clockOut })).toBeCloseTo(8, 5);
  });

  it("returns only the Sunday portion for a Saturday–Sunday overnight shift", () => {
    // Saturday 22:00 to Sunday 04:00 = 4 Sunday hours
    const satDate = new Date(2026, 1, 28); // Sat Feb 28
    const clockIn = new Date(satDate.getFullYear(), satDate.getMonth(), satDate.getDate(), 22, 0, 0, 0).toISOString();
    const clockOut = new Date(satDate.getFullYear(), satDate.getMonth(), satDate.getDate() + 1, 4, 0, 0, 0).toISOString();
    expect(calculateSundayHours({ clockIn, clockOut })).toBeCloseTo(4, 5);
  });

  it("returns only the Sunday portion for a Sunday–Monday overnight shift", () => {
    // Sunday 22:00 to Monday 02:00 = 2 Sunday hours
    const sunDate = new Date(2026, 2, 1); // Sun Mar 1
    const clockIn = new Date(sunDate.getFullYear(), sunDate.getMonth(), sunDate.getDate(), 22, 0, 0, 0).toISOString();
    const clockOut = new Date(sunDate.getFullYear(), sunDate.getMonth(), sunDate.getDate() + 1, 2, 0, 0, 0).toISOString();
    expect(calculateSundayHours({ clockIn, clockOut })).toBeCloseTo(2, 5);
  });
});

// ── calculatePaySummary ────────────────────────────────────────────────────

describe("calculatePaySummary", () => {
  const meta = getDefaultMetaData();

  it("returns all zeros for an empty entries array", () => {
    const summary = calculatePaySummary([], meta);
    expect(summary.totalHours).toBe(0);
    expect(summary.baseHours).toBe(0);
    expect(summary.otHours).toBe(0);
    expect(summary.penaltyOTHours).toBe(0);
    expect(summary.estimatedPay).toBe(0);
  });

  it("ignores open entries (no clockOut)", () => {
    const entries = [{ id: "1", clockIn: "2026-02-26T09:00:00.000Z", clockOut: null }];
    const summary = calculatePaySummary(entries, meta);
    expect(summary.totalHours).toBe(0);
  });

  it("calculates base hours for a normal 8-hour day", () => {
    const date = new Date(2026, 1, 23); // Mon
    const clockIn = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0, 0, 0).toISOString();
    const clockOut = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17, 0, 0, 0).toISOString();
    const entries = [{ id: "1", clockIn, clockOut }];
    const summary = calculatePaySummary(entries, meta);
    expect(summary.totalHours).toBeCloseTo(8, 5);
    expect(summary.baseHours).toBeCloseTo(8, 5);
    expect(summary.otHours).toBeCloseTo(0, 5);
    expect(summary.penaltyOTHours).toBeCloseTo(0, 5);
  });

  it("applies daily overtime for a 9-hour day", () => {
    const date = new Date(2026, 1, 23); // Mon
    const clockIn = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 8, 0, 0, 0).toISOString();
    const clockOut = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17, 0, 0, 0).toISOString();
    const entries = [{ id: "1", clockIn, clockOut }];
    const summary = calculatePaySummary(entries, meta);
    expect(summary.totalHours).toBeCloseTo(9, 5);
    expect(summary.baseHours).toBeCloseTo(8, 5);
    expect(summary.otHours).toBeCloseTo(1, 5);
    expect(summary.penaltyOTHours).toBeCloseTo(0, 5);
  });

  it("applies penalty overtime for an 11-hour day", () => {
    const date = new Date(2026, 1, 23); // Mon
    const clockIn = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 7, 0, 0, 0).toISOString();
    const clockOut = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 18, 0, 0, 0).toISOString();
    const entries = [{ id: "1", clockIn, clockOut }];
    const summary = calculatePaySummary(entries, meta);
    expect(summary.totalHours).toBeCloseTo(11, 5);
    expect(summary.baseHours).toBeCloseTo(8, 5);
    expect(summary.otHours).toBeCloseTo(2, 5);
    expect(summary.penaltyOTHours).toBeCloseTo(1, 5);
  });

  it("applies weekly overtime threshold across multiple days", () => {
    // 5 days × 9 hours = 45 total hours
    // Daily: 5 × 8 base + 5 × 1 OT = 40 base + 5 OT
    // Weekly: base 40 is exactly at weekly threshold, no weekly spillover
    const entries = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date(2026, 1, 23 + i); // Mon–Fri
      entries.push({
        id: String(i),
        clockIn: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 8, 0, 0, 0).toISOString(),
        clockOut: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17, 0, 0, 0).toISOString()
      });
    }
    const summary = calculatePaySummary(entries, meta);
    expect(summary.totalHours).toBeCloseTo(45, 4);
    expect(summary.baseHours).toBeCloseTo(40, 4);
    expect(summary.otHours).toBeCloseTo(5, 4);
    expect(summary.penaltyOTHours).toBeCloseTo(0, 4);
  });

  it("applies weekly overtime when daily hours are under daily threshold", () => {
    // 6 days × 7 hours = 42 total — all under 8h daily threshold
    // But weekly total 42 > 40, so 2 hours should become OT
    const entries = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date(2026, 1, 23 + i); // Mon–Sat
      entries.push({
        id: String(i),
        clockIn: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 8, 0, 0, 0).toISOString(),
        clockOut: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 15, 0, 0, 0).toISOString()
      });
    }
    const summary = calculatePaySummary(entries, meta);
    expect(summary.totalHours).toBeCloseTo(42, 4);
    expect(summary.baseHours).toBeCloseTo(40, 4);
    expect(summary.otHours).toBeCloseTo(2, 4);
    expect(summary.penaltyOTHours).toBeCloseTo(0, 4);
  });

  it("calculates estimated pay correctly for base-only hours", () => {
    // Single 8-hour day shift with no night/sunday impact
    const date = new Date(2026, 1, 24); // Tue (not Sunday)
    const clockIn = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0, 0, 0).toISOString();
    const clockOut = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17, 0, 0, 0).toISOString();
    const entries = [{ id: "1", clockIn, clockOut }];
    const summary = calculatePaySummary(entries, meta);
    const expectedPay = 8 * meta.baseHourlyRate;
    expect(summary.estimatedPay).toBeCloseTo(expectedPay, 2);
  });

  it("includes Sunday premium in estimated pay", () => {
    // Sunday 8-hour day shift
    const sunDate = new Date(2026, 2, 1); // Sun Mar 1
    const clockIn = new Date(sunDate.getFullYear(), sunDate.getMonth(), sunDate.getDate(), 9, 0, 0, 0).toISOString();
    const clockOut = new Date(sunDate.getFullYear(), sunDate.getMonth(), sunDate.getDate(), 17, 0, 0, 0).toISOString();
    const entries = [{ id: "1", clockIn, clockOut }];
    const summary = calculatePaySummary(entries, meta);
    const basePay = 8 * meta.baseHourlyRate;
    const sundayPremium = 8 * meta.baseHourlyRate * (meta.sundayPremiumPercent / 100);
    expect(summary.estimatedPay).toBeCloseTo(basePay + sundayPremium, 2);
    expect(summary.sundayHours).toBeCloseTo(8, 5);
    expect(summary.sundayPremiumPay).toBeCloseTo(sundayPremium, 2);
  });
});
