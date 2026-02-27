/**
 * hours-view.js — Hours View for Carrier Helper
 *
 * This file manages the Hours View which provides a calendar-style summary
 * of hours worked, broken down by pay type (base, overtime, penalty overtime),
 * with estimated income calculations that factor in night differential and
 * Sunday premiums.
 *
 * RESPONSIBILITIES:
 * - Rendering week, month, and year period summaries
 * - Period navigation (prev/next, date picker)
 * - Summary cards (total hours, pay breakdown)
 * - Breakdown tables (by day, week, or month)
 *
 * DEPENDENCIES:
 * - common.js (must be loaded first)
 *
 * WHAT BELONGS HERE:
 * - All DOM manipulation for the Hours View
 * - Period navigation logic
 * - HTML rendering for summary cards and tables
 *
 * WHAT DOES NOT BELONG HERE:
 * - Pay calculation logic (see common.js)
 * - Cloud sync (see cloud-sync.js)
 * - Import/export (see data-viewer.js)
 */

/* global loadEntries, loadMetaData, filterEntriesByRange */
/* global calculatePaySummary, toLocalDateString */

// ── DOM References ──────────────────────────────────────────────────────────

const hvPrevBtn = document.getElementById("hv-prev-btn");
const hvNextBtn = document.getElementById("hv-next-btn");
const hvPeriodLabel = document.getElementById("hv-period-label");
const hvDatePicker = document.getElementById("hv-date-picker");
const hvSummaryCards = document.getElementById("hv-summary-cards");
const hvTableEl = document.getElementById("hv-table");
const hvEmptyMsg = document.getElementById("hv-empty-msg");
const hvPeriodWeekBtn = document.getElementById("hv-period-week");
const hvPeriodMonthBtn = document.getElementById("hv-period-month");
const hvPeriodYearBtn = document.getElementById("hv-period-year");
const hvWeekPicker = document.getElementById("hv-week-picker");
const hvMonthPicker = document.getElementById("hv-month-picker");
const hvYearPicker = document.getElementById("hv-year-picker");
const hvMonthGrid = document.getElementById("hv-month-grid");
const hvYearBtns = document.getElementById("hv-year-btns");

// ── State ───────────────────────────────────────────────────────────────────

/** Currently selected period type: "week" | "month" | "year" */
let hvPeriodType = "week";

/** Reference date for the currently displayed period. */
let hvCurrentDate = new Date();

// ── Period Navigation Helpers ───────────────────────────────────────────────

/**
 * Get the Monday of the week containing the given date.
 * @param {Date} date
 * @returns {Date} Monday at 00:00:00.000 local time
 */
function hvGetWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, …
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Format a week range label (e.g., "Feb 23 – Mar 1, 2026").
 * @param {Date} weekStart - Monday of the week
 * @returns {string}
 */
function hvFormatWeekLabel(weekStart) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const opts = { month: "short", day: "numeric" };
  if (weekStart.getFullYear() !== weekEnd.getFullYear()) {
    return (
      weekStart.toLocaleDateString(undefined, { ...opts, year: "numeric" }) +
      " – " +
      weekEnd.toLocaleDateString(undefined, { ...opts, year: "numeric" })
    );
  }
  return (
    weekStart.toLocaleDateString(undefined, opts) +
    " – " +
    weekEnd.toLocaleDateString(undefined, { ...opts, year: "numeric" })
  );
}

/**
 * Format a month label (e.g., "February 2026").
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {string}
 */
function hvFormatMonthLabel(year, month) {
  return new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });
}

/**
 * Format a decimal hours value as "H:MM" (e.g., 8.5 → "8:30").
 * @param {number} hours
 * @returns {string}
 */
function hvFormatHours(hours) {
  if (hours <= 0) return "0:00";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

/**
 * Format a dollar amount (e.g., 1234.56 → "$1,234.56").
 * @param {number} value
 * @returns {string}
 */
function hvFormatMoney(value) {
  return "$" + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// ── Summary Cards ───────────────────────────────────────────────────────────

/**
 * Build the HTML for summary cards.
 * @param {Object} summary - Result of calculatePaySummary
 * @returns {string} HTML string
 */
function buildSummaryCardsHtml(summary) {
  const cards = [
    { label: "Total Hours", value: hvFormatHours(summary.totalHours), cls: "hv-card-total" },
    { label: "Base Rate Hours", value: hvFormatHours(summary.baseHours), cls: "hv-card-base" },
    { label: "Overtime Hours", value: hvFormatHours(summary.otHours), cls: "hv-card-ot" },
    { label: "Penalty OT Hours", value: hvFormatHours(summary.penaltyOTHours), cls: "hv-card-penalty" },
    { label: "Night Diff Hours", value: hvFormatHours(summary.nightDiffHours), cls: "hv-card-night" },
    { label: "Sunday Hours", value: hvFormatHours(summary.sundayHours), cls: "hv-card-sunday" },
    { label: "Estimated Pay", value: hvFormatMoney(summary.estimatedPay), cls: "hv-card-pay" }
  ];
  return cards
    .map(
      (c) =>
        `<div class="hv-summary-card ${c.cls}">
          <div class="hv-card-value">${c.value}</div>
          <div class="hv-card-label">${c.label}</div>
        </div>`
    )
    .join("");
}

// ── Week View ───────────────────────────────────────────────────────────────

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Build the HTML for a week breakdown table (one row per day).
 * @param {Array} allEntries - All stored entries
 * @param {Date} weekStart - Monday of the week
 * @param {Object} meta - Metadata/pay rates
 * @returns {string} HTML string
 */
function buildWeekTableHtml(allEntries, weekStart, meta) {
  const rows = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    const dayEnd = new Date(day);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dayEntries = filterEntriesByRange(allEntries, day, dayEnd, true);
    const summary = calculatePaySummary(dayEntries, meta);
    const hasData = summary.totalHours > 0;

    const dateStr = day.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    rows.push(
      `<tr class="${hasData ? "" : "hv-row-empty"}">
        <td>${DAY_NAMES[day.getDay()]}</td>
        <td>${dateStr}</td>
        <td>${hvFormatHours(summary.totalHours)}</td>
        <td>${hvFormatHours(summary.baseHours)}</td>
        <td>${hvFormatHours(summary.otHours)}</td>
        <td>${hvFormatHours(summary.penaltyOTHours)}</td>
        <td>${hvFormatHours(summary.nightDiffHours)}</td>
        <td>${hvFormatHours(summary.sundayHours)}</td>
        <td>${hasData ? hvFormatMoney(summary.estimatedPay) : "—"}</td>
      </tr>`
    );
  }

  // Weekly totals row
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEntries = filterEntriesByRange(allEntries, weekStart, weekEnd, true);
  const weekSummary = calculatePaySummary(weekEntries, meta);

  rows.push(
    `<tr class="hv-row-total">
      <td colspan="2"><strong>Week Total</strong></td>
      <td><strong>${hvFormatHours(weekSummary.totalHours)}</strong></td>
      <td><strong>${hvFormatHours(weekSummary.baseHours)}</strong></td>
      <td><strong>${hvFormatHours(weekSummary.otHours)}</strong></td>
      <td><strong>${hvFormatHours(weekSummary.penaltyOTHours)}</strong></td>
      <td><strong>${hvFormatHours(weekSummary.nightDiffHours)}</strong></td>
      <td><strong>${hvFormatHours(weekSummary.sundayHours)}</strong></td>
      <td><strong>${hvFormatMoney(weekSummary.estimatedPay)}</strong></td>
    </tr>`
  );

  return `
    <thead>
      <tr>
        <th>Day</th>
        <th>Date</th>
        <th>Total Hrs</th>
        <th>Base</th>
        <th>Overtime</th>
        <th>Penalty OT</th>
        <th>Night Diff</th>
        <th>Sunday</th>
        <th>Est. Pay</th>
      </tr>
    </thead>
    <tbody>${rows.join("")}</tbody>`;
}

/**
 * Get the first Monday that falls on or after the first day of a given month.
 * A week is attributed to the month where its Monday falls, so this finds
 * the starting point for iterating weeks that belong to that month.
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {Date} Monday at 00:00:00.000 local time
 */
function hvGetFirstWeekOfMonth(year, month) {
  const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
  const weekStart = hvGetWeekStart(monthStart);
  if (weekStart < monthStart) {
    weekStart.setDate(weekStart.getDate() + 7);
  }
  return weekStart;
}

// ── Month View ──────────────────────────────────────────────────────────────

/**
 * Build the HTML for a month breakdown table (one row per week whose Monday
 * falls within the month).
 * @param {Array} allEntries - All stored entries
 * @param {number} year
 * @param {number} month - 0-indexed
 * @param {Object} meta - Metadata/pay rates
 * @returns {string} HTML string
 */
function buildMonthTableHtml(allEntries, year, month, meta) {
  // Only include weeks whose Monday falls within this month (no double-counting)
  const nextMonthStart = new Date(year, month + 1, 1, 0, 0, 0, 0);
  let weekCursor = hvGetFirstWeekOfMonth(year, month);

  const rows = [];
  const weeklySummaries = [];

  while (weekCursor < nextMonthStart) {
    const weekEnd = new Date(weekCursor);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekLabel = hvFormatWeekLabel(weekCursor);
    const weekEntries = filterEntriesByRange(allEntries, weekCursor, weekEnd, true);
    const summary = calculatePaySummary(weekEntries, meta);
    weeklySummaries.push(summary);
    const hasData = summary.totalHours > 0;

    rows.push(
      `<tr class="${hasData ? "" : "hv-row-empty"}">
        <td class="hv-cell-wrap">${weekLabel}</td>
        <td>${hvFormatHours(summary.totalHours)}</td>
        <td>${hvFormatHours(summary.baseHours)}</td>
        <td>${hvFormatHours(summary.otHours)}</td>
        <td>${hvFormatHours(summary.penaltyOTHours)}</td>
        <td>${hvFormatHours(summary.nightDiffHours)}</td>
        <td>${hvFormatHours(summary.sundayHours)}</td>
        <td>${hasData ? hvFormatMoney(summary.estimatedPay) : "—"}</td>
      </tr>`
    );

    weekCursor.setDate(weekCursor.getDate() + 7);
  }

  // Month totals row (sum of weekly summaries)
  const totals = weeklySummaries.reduce(
    (acc, s) => ({
      totalHours: acc.totalHours + s.totalHours,
      baseHours: acc.baseHours + s.baseHours,
      otHours: acc.otHours + s.otHours,
      penaltyOTHours: acc.penaltyOTHours + s.penaltyOTHours,
      nightDiffHours: acc.nightDiffHours + s.nightDiffHours,
      sundayHours: acc.sundayHours + s.sundayHours,
      estimatedPay: acc.estimatedPay + s.estimatedPay
    }),
    { totalHours: 0, baseHours: 0, otHours: 0, penaltyOTHours: 0, nightDiffHours: 0, sundayHours: 0, estimatedPay: 0 }
  );

  rows.push(
    `<tr class="hv-row-total">
      <td><strong>Month Total</strong></td>
      <td><strong>${hvFormatHours(totals.totalHours)}</strong></td>
      <td><strong>${hvFormatHours(totals.baseHours)}</strong></td>
      <td><strong>${hvFormatHours(totals.otHours)}</strong></td>
      <td><strong>${hvFormatHours(totals.penaltyOTHours)}</strong></td>
      <td><strong>${hvFormatHours(totals.nightDiffHours)}</strong></td>
      <td><strong>${hvFormatHours(totals.sundayHours)}</strong></td>
      <td><strong>${hvFormatMoney(totals.estimatedPay)}</strong></td>
    </tr>`
  );

  return `
    <thead>
      <tr>
        <th>Week</th>
        <th>Total Hrs</th>
        <th>Base</th>
        <th>Overtime</th>
        <th>Penalty OT</th>
        <th>Night Diff</th>
        <th>Sunday</th>
        <th>Est. Pay</th>
      </tr>
    </thead>
    <tbody>${rows.join("")}</tbody>`;
}

// ── Year View ───────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Build the HTML for a year breakdown table (one row per month).
 * Each month's OT is calculated on a per-week basis.
 * @param {Array} allEntries - All stored entries
 * @param {number} year
 * @param {Object} meta - Metadata/pay rates
 * @returns {string} HTML string
 */
function buildYearTableHtml(allEntries, year, meta) {
  const rows = [];
  const monthlySummaries = [];

  for (let month = 0; month < 12; month++) {

    // Sum weekly summaries for the month (only weeks whose Monday falls in the month)
    let weekCursor = hvGetFirstWeekOfMonth(year, month);
    const nextMonthStart = new Date(year, month + 1, 1, 0, 0, 0, 0);
    const weeklySummaries = [];

    while (weekCursor < nextMonthStart) {
      const weekEnd = new Date(weekCursor);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekEntries = filterEntriesByRange(allEntries, weekCursor, weekEnd, true);
      weeklySummaries.push(calculatePaySummary(weekEntries, meta));
      weekCursor.setDate(weekCursor.getDate() + 7);
    }

    const totals = weeklySummaries.reduce(
      (acc, s) => ({
        totalHours: acc.totalHours + s.totalHours,
        baseHours: acc.baseHours + s.baseHours,
        otHours: acc.otHours + s.otHours,
        penaltyOTHours: acc.penaltyOTHours + s.penaltyOTHours,
        nightDiffHours: acc.nightDiffHours + s.nightDiffHours,
        sundayHours: acc.sundayHours + s.sundayHours,
        estimatedPay: acc.estimatedPay + s.estimatedPay
      }),
      { totalHours: 0, baseHours: 0, otHours: 0, penaltyOTHours: 0, nightDiffHours: 0, sundayHours: 0, estimatedPay: 0 }
    );

    monthlySummaries.push(totals);
    const hasData = totals.totalHours > 0;

    rows.push(
      `<tr class="${hasData ? "" : "hv-row-empty"}">
        <td>${MONTH_NAMES[month]}</td>
        <td>${hvFormatHours(totals.totalHours)}</td>
        <td>${hvFormatHours(totals.baseHours)}</td>
        <td>${hvFormatHours(totals.otHours)}</td>
        <td>${hvFormatHours(totals.penaltyOTHours)}</td>
        <td>${hvFormatHours(totals.nightDiffHours)}</td>
        <td>${hvFormatHours(totals.sundayHours)}</td>
        <td>${hasData ? hvFormatMoney(totals.estimatedPay) : "—"}</td>
      </tr>`
    );
  }

  // Year totals row
  const yearTotals = monthlySummaries.reduce(
    (acc, s) => ({
      totalHours: acc.totalHours + s.totalHours,
      baseHours: acc.baseHours + s.baseHours,
      otHours: acc.otHours + s.otHours,
      penaltyOTHours: acc.penaltyOTHours + s.penaltyOTHours,
      nightDiffHours: acc.nightDiffHours + s.nightDiffHours,
      sundayHours: acc.sundayHours + s.sundayHours,
      estimatedPay: acc.estimatedPay + s.estimatedPay
    }),
    { totalHours: 0, baseHours: 0, otHours: 0, penaltyOTHours: 0, nightDiffHours: 0, sundayHours: 0, estimatedPay: 0 }
  );

  rows.push(
    `<tr class="hv-row-total">
      <td><strong>Year Total</strong></td>
      <td><strong>${hvFormatHours(yearTotals.totalHours)}</strong></td>
      <td><strong>${hvFormatHours(yearTotals.baseHours)}</strong></td>
      <td><strong>${hvFormatHours(yearTotals.otHours)}</strong></td>
      <td><strong>${hvFormatHours(yearTotals.penaltyOTHours)}</strong></td>
      <td><strong>${hvFormatHours(yearTotals.nightDiffHours)}</strong></td>
      <td><strong>${hvFormatHours(yearTotals.sundayHours)}</strong></td>
      <td><strong>${hvFormatMoney(yearTotals.estimatedPay)}</strong></td>
    </tr>`
  );

  return `
    <thead>
      <tr>
        <th>Month</th>
        <th>Total Hrs</th>
        <th>Base</th>
        <th>Overtime</th>
        <th>Penalty OT</th>
        <th>Night Diff</th>
        <th>Sunday</th>
        <th>Est. Pay</th>
      </tr>
    </thead>
    <tbody>${rows.join("")}</tbody>`;
}

// ── Main Render ─────────────────────────────────────────────────────────────

/**
 * Render the Hours View for the current period type and reference date.
 * Called whenever the user switches to this view or navigates periods.
 */
function renderHoursView() {
  const allEntries = loadEntries();
  const meta = loadMetaData();

  let summaryForCards;
  let tableHtml;

  if (hvPeriodType === "week") {
    const weekStart = hvGetWeekStart(hvCurrentDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    hvPeriodLabel.textContent = hvFormatWeekLabel(weekStart);

    const weekEntries = filterEntriesByRange(allEntries, weekStart, weekEnd, true);
    summaryForCards = calculatePaySummary(weekEntries, meta);
    tableHtml = buildWeekTableHtml(allEntries, weekStart, meta);

  } else if (hvPeriodType === "month") {
    const year = hvCurrentDate.getFullYear();
    const month = hvCurrentDate.getMonth();
    hvPeriodLabel.textContent = hvFormatMonthLabel(year, month);

    // Sum weekly summaries for summary cards (weeks whose Monday is in this month)
    let weekCursor = hvGetFirstWeekOfMonth(year, month);
    const nextMonthStart = new Date(year, month + 1, 1, 0, 0, 0, 0);
    const weeklySummaries = [];
    while (weekCursor < nextMonthStart) {
      const weekEnd = new Date(weekCursor);
      weekEnd.setDate(weekEnd.getDate() + 7);
      weeklySummaries.push(calculatePaySummary(
        filterEntriesByRange(allEntries, weekCursor, weekEnd, true),
        meta
      ));
      weekCursor.setDate(weekCursor.getDate() + 7);
    }
    summaryForCards = weeklySummaries.reduce(
      (acc, s) => ({
        totalHours: acc.totalHours + s.totalHours,
        baseHours: acc.baseHours + s.baseHours,
        otHours: acc.otHours + s.otHours,
        penaltyOTHours: acc.penaltyOTHours + s.penaltyOTHours,
        nightDiffHours: acc.nightDiffHours + s.nightDiffHours,
        sundayHours: acc.sundayHours + s.sundayHours,
        basePay: acc.basePay + s.basePay,
        otPay: acc.otPay + s.otPay,
        penaltyOTPay: acc.penaltyOTPay + s.penaltyOTPay,
        nightDiffPay: acc.nightDiffPay + s.nightDiffPay,
        sundayPremiumPay: acc.sundayPremiumPay + s.sundayPremiumPay,
        estimatedPay: acc.estimatedPay + s.estimatedPay
      }),
      {
        totalHours: 0, baseHours: 0, otHours: 0, penaltyOTHours: 0,
        nightDiffHours: 0, sundayHours: 0,
        basePay: 0, otPay: 0, penaltyOTPay: 0, nightDiffPay: 0,
        sundayPremiumPay: 0, estimatedPay: 0
      }
    );
    tableHtml = buildMonthTableHtml(allEntries, year, month, meta);

  } else {
    // year
    const year = hvCurrentDate.getFullYear();
    hvPeriodLabel.textContent = String(year);

    // Sum all weekly summaries for weeks whose Monday falls within the year
    const yearStart = new Date(year, 0, 1, 0, 0, 0, 0);
    const nextYearStart = new Date(year + 1, 0, 1, 0, 0, 0, 0);
    let weekCursor = hvGetWeekStart(yearStart);
    if (weekCursor < yearStart) {
      weekCursor.setDate(weekCursor.getDate() + 7);
    }
    const weeklySummaries = [];
    while (weekCursor < nextYearStart) {
      const weekEnd = new Date(weekCursor);
      weekEnd.setDate(weekEnd.getDate() + 7);
      weeklySummaries.push(calculatePaySummary(
        filterEntriesByRange(allEntries, weekCursor, weekEnd, true),
        meta
      ));
      weekCursor.setDate(weekCursor.getDate() + 7);
    }
    summaryForCards = weeklySummaries.reduce(
      (acc, s) => ({
        totalHours: acc.totalHours + s.totalHours,
        baseHours: acc.baseHours + s.baseHours,
        otHours: acc.otHours + s.otHours,
        penaltyOTHours: acc.penaltyOTHours + s.penaltyOTHours,
        nightDiffHours: acc.nightDiffHours + s.nightDiffHours,
        sundayHours: acc.sundayHours + s.sundayHours,
        basePay: acc.basePay + s.basePay,
        otPay: acc.otPay + s.otPay,
        penaltyOTPay: acc.penaltyOTPay + s.penaltyOTPay,
        nightDiffPay: acc.nightDiffPay + s.nightDiffPay,
        sundayPremiumPay: acc.sundayPremiumPay + s.sundayPremiumPay,
        estimatedPay: acc.estimatedPay + s.estimatedPay
      }),
      {
        totalHours: 0, baseHours: 0, otHours: 0, penaltyOTHours: 0,
        nightDiffHours: 0, sundayHours: 0,
        basePay: 0, otPay: 0, penaltyOTPay: 0, nightDiffPay: 0,
        sundayPremiumPay: 0, estimatedPay: 0
      }
    );
    tableHtml = buildYearTableHtml(allEntries, year, meta);
  }

  // Update summary cards
  hvSummaryCards.innerHTML = buildSummaryCardsHtml(summaryForCards);

  // Update table
  const hasAnyHours = summaryForCards.totalHours > 0;
  if (hasAnyHours) {
    hvTableEl.innerHTML = tableHtml;
    hvTableEl.style.display = "";
    hvEmptyMsg.style.display = "none";
  } else {
    hvTableEl.innerHTML = "";
    hvTableEl.style.display = "none";
    hvEmptyMsg.style.display = "block";
  }

  // Update picker UI
  if (hvPeriodType === "week") {
    hvDatePicker.value = toLocalDateString(hvCurrentDate.toISOString());
  } else if (hvPeriodType === "month") {
    const curMonth = hvCurrentDate.getMonth();
    hvMonthGrid.innerHTML = MONTH_SHORT_NAMES.map((name, i) =>
      `<button class="hv-month-btn${i === curMonth ? " active" : ""}" data-month="${i}">${name}</button>`
    ).join("");
  } else {
    const yearsSet = new Set(
      allEntries
        .filter(e => e.clockIn)
        .map(e => new Date(e.clockIn).getFullYear())
        .filter(y => !isNaN(y))
    );
    const curYear = hvCurrentDate.getFullYear();
    yearsSet.add(curYear);
    const years = Array.from(yearsSet).sort((a, b) => a - b);
    hvYearBtns.innerHTML = years.map(y =>
      `<button class="hv-year-btn${y === curYear ? " active" : ""}" data-year="${y}">${y}</button>`
    ).join("");
  }
}

// ── Period Type Switching ───────────────────────────────────────────────────

/**
 * Switch the period type and update button active states.
 * @param {string} type - "week" | "month" | "year"
 */
function hvSetPeriodType(type) {
  hvPeriodType = type;
  hvPeriodWeekBtn.classList.toggle("active", type === "week");
  hvPeriodMonthBtn.classList.toggle("active", type === "month");
  hvPeriodYearBtn.classList.toggle("active", type === "year");

  hvWeekPicker.style.display = type === "week" ? "" : "none";
  hvMonthPicker.style.display = type === "month" ? "" : "none";
  hvYearPicker.style.display = type === "year" ? "" : "none";

  renderHoursView();
}

// ── Initialization ──────────────────────────────────────────────────────────

/**
 * Initialize the Hours View: attach event listeners.
 * Called once on application startup.
 */
function initHoursView() {
  // Period type buttons
  hvPeriodWeekBtn.addEventListener("click", () => hvSetPeriodType("week"));
  hvPeriodMonthBtn.addEventListener("click", () => hvSetPeriodType("month"));
  hvPeriodYearBtn.addEventListener("click", () => hvSetPeriodType("year"));

  // Prev/Next navigation
  hvPrevBtn.addEventListener("click", () => {
    if (hvPeriodType === "week") {
      hvCurrentDate.setDate(hvCurrentDate.getDate() - 7);
    } else if (hvPeriodType === "month") {
      hvCurrentDate.setMonth(hvCurrentDate.getMonth() - 1);
    } else {
      hvCurrentDate.setFullYear(hvCurrentDate.getFullYear() - 1);
    }
    renderHoursView();
  });

  hvNextBtn.addEventListener("click", () => {
    if (hvPeriodType === "week") {
      hvCurrentDate.setDate(hvCurrentDate.getDate() + 7);
    } else if (hvPeriodType === "month") {
      hvCurrentDate.setMonth(hvCurrentDate.getMonth() + 1);
    } else {
      hvCurrentDate.setFullYear(hvCurrentDate.getFullYear() + 1);
    }
    renderHoursView();
  });

  // Date picker (week mode only)
  hvDatePicker.addEventListener("change", () => {
    if (hvPeriodType !== "week") return;
    const val = hvDatePicker.value;
    if (!val) return;
    // val is "YYYY-MM-DD" — parse as local midnight to avoid UTC offset issues
    const parts = val.split("-");
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 0, 0, 0, 0);
      if (!isNaN(d.getTime())) hvCurrentDate = d;
    }
    renderHoursView();
  });

  // This Week button
  document.getElementById("hv-this-week-btn").addEventListener("click", () => {
    hvCurrentDate = new Date();
    renderHoursView();
  });

  // This Month button
  document.getElementById("hv-this-month-btn").addEventListener("click", () => {
    hvCurrentDate = new Date();
    renderHoursView();
  });

  // Month grid (event delegation)
  hvMonthGrid.addEventListener("click", (e) => {
    const btn = e.target.closest(".hv-month-btn");
    if (!btn) return;
    const month = parseInt(btn.dataset.month, 10);
    hvCurrentDate = new Date(hvCurrentDate.getFullYear(), month, 1, 0, 0, 0, 0);
    renderHoursView();
  });

  // Year buttons (event delegation)
  hvYearBtns.addEventListener("click", (e) => {
    const btn = e.target.closest(".hv-year-btn");
    if (!btn) return;
    const year = parseInt(btn.dataset.year, 10);
    hvCurrentDate = new Date(year, hvCurrentDate.getMonth(), 1, 0, 0, 0, 0);
    renderHoursView();
  });
}

// ── Export for testing (Node.js environment) ───────────────────────────────

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    renderHoursView,
    initHoursView,
    hvGetWeekStart,
    hvFormatWeekLabel,
    hvFormatMonthLabel,
    hvFormatHours,
    hvFormatMoney
  };
}
