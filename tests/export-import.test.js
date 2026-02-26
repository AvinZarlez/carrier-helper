/**
 * export-import.test.js — Comprehensive tests for export and import logic
 *
 * Tests cover:
 * - filterEntriesByRange: date-range filtering of entries
 * - getExportEntries: selection-aware export (selected entries or whole view range)
 * - Export CSV content: generateCSV, generateMetaDataCSV, generateAllDataCSV
 * - Import CSV parsing: parseCSV, parseMetaDataCSV, parseAllDataCSV
 * - Import type detection: detectCSVType
 * - Round-trip export → import for all three CSV formats
 * - Edge cases: empty data, only metadata, only entries, mixed
 */

const {
  filterEntriesByRange,
  getExportEntries,
  generateCSV,
  parseCSV,
  generateMetaDataCSV,
  parseMetaDataCSV,
  generateAllDataCSV,
  parseAllDataCSV,
  detectCSVType,
  getDefaultMetaData,
  loadMetaData,
  saveMetaData,
  loadEntries,
  saveEntries,
  mergeEntries
} = require("../js/common.js");

// ── Test Helpers ─────────────────────────────────────────────────────────────

/**
 * Create a test entry with a given clockIn date string (YYYY-MM-DD) at 09:00 UTC.
 * @param {string} id
 * @param {string} clockInDate - YYYY-MM-DD
 * @param {string|null} [clockOutDate] - YYYY-MM-DD (at 17:00 UTC), or null
 */
function makeEntry(id, clockInDate, clockOutDate = null) {
  return {
    id,
    clockIn: clockInDate + "T09:00:00.000Z",
    clockOut: clockOutDate ? clockOutDate + "T17:00:00.000Z" : null,
    notes: ""
  };
}

// ── filterEntriesByRange ──────────────────────────────────────────────────────

describe("filterEntriesByRange", () => {
  const entries = [
    makeEntry("mon", "2024-01-01"),
    makeEntry("tue", "2024-01-02"),
    makeEntry("wed", "2024-01-03"),
    makeEntry("thu", "2024-01-04"),
    makeEntry("sun", "2024-01-07"),
    makeEntry("next-mon", "2024-01-08"),
    makeEntry("far", "2024-02-15")
  ];

  it("should include entries on the start date (inclusive start)", () => {
    const start = new Date("2024-01-01T00:00:00");
    const end = new Date("2024-01-07T23:59:59.999");
    const result = filterEntriesByRange(entries, start, end, false);
    expect(result.map((e) => e.id)).toContain("mon");
  });

  it("should include entries on the end date when inclusive (exclusiveEnd=false)", () => {
    const start = new Date("2024-01-01T00:00:00");
    const end = new Date("2024-01-07T23:59:59.999");
    const result = filterEntriesByRange(entries, start, end, false);
    expect(result.map((e) => e.id)).toContain("sun");
  });

  it("should exclude entries on the end date when exclusive (exclusiveEnd=true)", () => {
    const start = new Date("2024-01-01T00:00:00");
    const end = new Date("2024-01-08T00:00:00"); // Monday = exclusive upper bound
    const result = filterEntriesByRange(entries, start, end, true);
    expect(result.map((e) => e.id)).not.toContain("next-mon");
  });

  it("should exclude entries before the start date", () => {
    const start = new Date("2024-01-02T00:00:00");
    const end = new Date("2024-01-07T23:59:59.999");
    const result = filterEntriesByRange(entries, start, end, false);
    expect(result.map((e) => e.id)).not.toContain("mon");
  });

  it("should exclude entries after the end date", () => {
    const start = new Date("2024-01-01T00:00:00");
    const end = new Date("2024-01-07T23:59:59.999");
    const result = filterEntriesByRange(entries, start, end, false);
    expect(result.map((e) => e.id)).not.toContain("next-mon");
    expect(result.map((e) => e.id)).not.toContain("far");
  });

  it("should return only entries within the week range (Mon–Sun inclusive)", () => {
    const start = new Date("2024-01-01T00:00:00");
    const end = new Date("2024-01-08T00:00:00"); // exclusive
    const result = filterEntriesByRange(entries, start, end, true);
    expect(result.map((e) => e.id)).toEqual(["mon", "tue", "wed", "thu", "sun"]);
  });

  it("should return empty array when no entries fall in range", () => {
    const start = new Date("2024-03-01T00:00:00");
    const end = new Date("2024-03-07T23:59:59.999");
    const result = filterEntriesByRange(entries, start, end, false);
    expect(result).toHaveLength(0);
  });

  it("should return all entries when range covers everything", () => {
    const start = new Date("2024-01-01T00:00:00");
    const end = new Date("2024-12-31T23:59:59.999");
    const result = filterEntriesByRange(entries, start, end, false);
    expect(result).toHaveLength(entries.length);
  });

  it("should handle an empty entries array", () => {
    const start = new Date("2024-01-01T00:00:00");
    const end = new Date("2024-01-07T23:59:59.999");
    expect(filterEntriesByRange([], start, end, false)).toHaveLength(0);
  });
});

// ── getExportEntries ──────────────────────────────────────────────────────────

describe("getExportEntries", () => {
  const entries = [
    makeEntry("a", "2024-01-01"),
    makeEntry("b", "2024-01-02"),
    makeEntry("c", "2024-01-03"),
    makeEntry("out-of-range", "2024-01-15")
  ];

  // Current week: Mon 2024-01-01 → (exclusive) Mon 2024-01-08
  const weekStart = new Date("2024-01-01T00:00:00");
  const weekEnd = new Date("2024-01-08T00:00:00"); // exclusive

  describe("nothing selected — export current view range", () => {
    it("should export all entries in the view range when Set is empty", () => {
      const result = getExportEntries(entries, new Set(), weekStart, weekEnd, true);
      expect(result.map((e) => e.id)).toEqual(["a", "b", "c"]);
    });

    it("should export all in-range entries when selectedIds is null", () => {
      const result = getExportEntries(entries, null, weekStart, weekEnd, true);
      expect(result.map((e) => e.id)).toEqual(["a", "b", "c"]);
    });

    it("should export all in-range entries when selectedIds is an empty array", () => {
      const result = getExportEntries(entries, [], weekStart, weekEnd, true);
      expect(result.map((e) => e.id)).toEqual(["a", "b", "c"]);
    });

    it("should NOT include entries outside the view range", () => {
      const result = getExportEntries(entries, new Set(), weekStart, weekEnd, true);
      expect(result.find((e) => e.id === "out-of-range")).toBeUndefined();
    });

    it("should return empty array when no entries are in range", () => {
      const futureStart = new Date("2025-01-01T00:00:00");
      const futureEnd = new Date("2025-01-08T00:00:00");
      const result = getExportEntries(entries, new Set(), futureStart, futureEnd, true);
      expect(result).toHaveLength(0);
    });
  });

  describe("entries selected — export only those selections", () => {
    it("should export only the selected entries", () => {
      const selected = new Set(["a", "c"]);
      const result = getExportEntries(entries, selected, weekStart, weekEnd, true);
      expect(result.map((e) => e.id)).toEqual(["a", "c"]);
    });

    it("should NOT export unselected entries that are in the view range", () => {
      const selected = new Set(["a"]);
      const result = getExportEntries(entries, selected, weekStart, weekEnd, true);
      expect(result.find((e) => e.id === "b")).toBeUndefined();
      expect(result.find((e) => e.id === "c")).toBeUndefined();
    });

    it("should export exactly one entry when only one is selected", () => {
      const selected = new Set(["b"]);
      const result = getExportEntries(entries, selected, weekStart, weekEnd, true);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("b");
    });

    it("should work with a Set containing all in-range entry IDs", () => {
      const selected = new Set(["a", "b", "c"]);
      const result = getExportEntries(entries, selected, weekStart, weekEnd, true);
      expect(result).toHaveLength(3);
    });
  });

  describe("custom date range view", () => {
    it("should only include entries in the custom range (inclusive)", () => {
      const rangeStart = new Date("2024-01-02T00:00:00");
      const rangeEnd = new Date("2024-01-02T23:59:59.999");
      const result = getExportEntries(entries, new Set(), rangeStart, rangeEnd, false);
      expect(result.map((e) => e.id)).toEqual(["b"]);
    });

    it("should exclude entries before the custom range start", () => {
      const rangeStart = new Date("2024-01-02T00:00:00");
      const rangeEnd = new Date("2024-01-03T23:59:59.999");
      const result = getExportEntries(entries, new Set(), rangeStart, rangeEnd, false);
      expect(result.find((e) => e.id === "a")).toBeUndefined();
    });

    it("should exclude entries after the custom range end", () => {
      const rangeStart = new Date("2024-01-01T00:00:00");
      const rangeEnd = new Date("2024-01-02T23:59:59.999");
      const result = getExportEntries(entries, new Set(), rangeStart, rangeEnd, false);
      expect(result.find((e) => e.id === "c")).toBeUndefined();
      expect(result.find((e) => e.id === "out-of-range")).toBeUndefined();
    });
  });
});

// ── Export CSV — time entries ─────────────────────────────────────────────────

describe("Export time entries CSV content", () => {
  const entries = [
    makeEntry("e1", "2024-01-01", "2024-01-01"),
    makeEntry("e2", "2024-01-02", "2024-01-02"),
    makeEntry("e3-open", "2024-01-03", null)
  ];

  it("should generate a CSV with a header row", () => {
    const csv = generateCSV(entries);
    const firstLine = csv.split("\n")[0];
    expect(firstLine).toContain("id");
    expect(firstLine).toContain("clockIn");
    expect(firstLine).toContain("clockOut");
  });

  it("should include all entry IDs in the CSV", () => {
    const csv = generateCSV(entries);
    expect(csv).toContain("e1");
    expect(csv).toContain("e2");
    expect(csv).toContain("e3-open");
  });

  it("should produce one data row per entry", () => {
    const csv = generateCSV(entries);
    const lines = csv.split("\n");
    expect(lines.length).toBe(entries.length + 1); // header + entries
  });

  it("should generate an empty CSV (header only) when given no entries", () => {
    const csv = generateCSV([]);
    const lines = csv.split("\n");
    expect(lines.length).toBe(1); // header only
    expect(lines[0]).toContain("id");
  });

  it("should leave clockOut null for open entries (round-trip verify)", () => {
    const csv = generateCSV([makeEntry("open", "2024-01-01", null)]);
    const parsed = parseCSV(csv);
    expect(parsed[0].clockOut).toBeNull();
  });

  it("exported CSV should parse back to the same entries (round-trip)", () => {
    const original = [
      makeEntry("rt1", "2024-01-01", "2024-01-01"),
      makeEntry("rt2", "2024-01-02", null)
    ];
    const csv = generateCSV(original);
    const parsed = parseCSV(csv);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].id).toBe("rt1");
    expect(parsed[1].id).toBe("rt2");
    expect(parsed[1].clockOut).toBeNull();
  });
});

// ── Export CSV — metadata ─────────────────────────────────────────────────────

describe("Export metadata CSV content", () => {
  it("should generate a CSV with key/value header", () => {
    const csv = generateMetaDataCSV(getDefaultMetaData());
    expect(csv.split("\n")[0]).toBe('"key","value"');
  });

  it("should include the base hourly rate", () => {
    const meta = { ...getDefaultMetaData(), baseHourlyRate: 27.5 };
    const csv = generateMetaDataCSV(meta);
    expect(csv).toContain("baseHourlyRate");
    expect(csv).toContain("27.5");
  });

  it("should generate one row per metadata field", () => {
    const meta = getDefaultMetaData();
    const csv = generateMetaDataCSV(meta);
    const lines = csv.split("\n");
    expect(lines.length).toBe(Object.keys(meta).length + 1); // header + fields
  });

  it("should generate an empty CSV (header only) for empty metadata", () => {
    const csv = generateMetaDataCSV({});
    expect(csv).toBe('"key","value"');
  });

  it("should round-trip: generateMetaDataCSV → parseMetaDataCSV", () => {
    const original = getDefaultMetaData();
    const csv = generateMetaDataCSV(original);
    const parsed = parseMetaDataCSV(csv);
    expect(parsed).toEqual(original);
  });

  it("should preserve custom values on round-trip", () => {
    const custom = { ...getDefaultMetaData(), baseHourlyRate: 30.0, sundayPremiumPercent: 50 };
    const csv = generateMetaDataCSV(custom);
    const parsed = parseMetaDataCSV(csv);
    expect(parsed.baseHourlyRate).toBe(30.0);
    expect(parsed.sundayPremiumPercent).toBe(50);
  });

  it("should preserve night differential time strings on round-trip", () => {
    const custom = { ...getDefaultMetaData(), nightDiffStartTime: "20:00", nightDiffEndTime: "04:00" };
    const csv = generateMetaDataCSV(custom);
    const parsed = parseMetaDataCSV(csv);
    expect(parsed.nightDiffStartTime).toBe("20:00");
    expect(parsed.nightDiffEndTime).toBe("04:00");
  });
});

// ── Export CSV — all data ─────────────────────────────────────────────────────

describe("Export ALL data CSV content", () => {
  const entries = [
    makeEntry("e1", "2024-01-01", "2024-01-01"),
    makeEntry("e2", "2024-01-02", null)
  ];
  const meta = getDefaultMetaData();

  it("should include a type column distinguishing meta and entry rows", () => {
    const csv = generateAllDataCSV(entries, meta);
    expect(csv).toContain('"meta"');
    expect(csv).toContain('"entry"');
  });

  it("should include metadata values in meta rows", () => {
    const csv = generateAllDataCSV(entries, meta);
    expect(csv).toContain("baseHourlyRate");
    expect(csv).toContain(String(meta.baseHourlyRate));
  });

  it("should include entry IDs in entry rows", () => {
    const csv = generateAllDataCSV(entries, meta);
    expect(csv).toContain("e1");
    expect(csv).toContain("e2");
  });

  it("should work with only metadata and no entries", () => {
    const csv = generateAllDataCSV([], meta);
    const lines = csv.split("\n");
    expect(lines.length).toBe(Object.keys(meta).length + 1); // header + meta rows
    expect(csv).not.toContain('"entry"');
  });

  it("should work with only entries and no metadata", () => {
    const csv = generateAllDataCSV(entries, {});
    const lines = csv.split("\n");
    expect(lines.length).toBe(entries.length + 1); // header + entry rows
    expect(csv).not.toContain('"meta"');
  });

  it("should work with both empty entries and empty metadata", () => {
    const csv = generateAllDataCSV([], {});
    const lines = csv.split("\n");
    expect(lines.length).toBe(1); // header only
  });

  it("should round-trip: generateAllDataCSV → parseAllDataCSV", () => {
    const csv = generateAllDataCSV(entries, meta);
    const result = parseAllDataCSV(csv);
    expect(result).not.toBeNull();
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].id).toBe("e1");
    expect(result.entries[1].id).toBe("e2");
    expect(result.meta.baseHourlyRate).toBe(meta.baseHourlyRate);
    expect(result.meta.nightDiffStartTime).toBe(meta.nightDiffStartTime);
  });

  it("should preserve open entries (null clockOut) on round-trip", () => {
    const openEntries = [makeEntry("open", "2024-01-01", null)];
    const csv = generateAllDataCSV(openEntries, {});
    const result = parseAllDataCSV(csv);
    expect(result.entries[0].clockOut).toBeNull();
  });
});

// ── Import — detectCSVType ────────────────────────────────────────────────────

describe("detectCSVType", () => {
  it("should detect a time entries CSV", () => {
    const csv = generateCSV([makeEntry("e1", "2024-01-01")]);
    expect(detectCSVType(csv)).toBe("entries");
  });

  it("should detect a metadata CSV", () => {
    const csv = generateMetaDataCSV(getDefaultMetaData());
    expect(detectCSVType(csv)).toBe("metadata");
  });

  it("should detect an all-data CSV", () => {
    const csv = generateAllDataCSV([makeEntry("e1", "2024-01-01")], getDefaultMetaData());
    expect(detectCSVType(csv)).toBe("all");
  });

  it("should return unknown for an empty string", () => {
    expect(detectCSVType("")).toBe("unknown");
  });

  it("should return unknown for arbitrary CSV", () => {
    expect(detectCSVType("foo,bar\n1,2")).toBe("unknown");
  });

  it("should detect entries CSV even with header-only (no rows)", () => {
    const csv = generateCSV([]);
    expect(detectCSVType(csv)).toBe("entries");
  });
});

// ── Import — parseCSV (time entries) ─────────────────────────────────────────

describe("Import time entries (parseCSV)", () => {
  it("should parse a single entry", () => {
    const entries = [makeEntry("e1", "2024-01-01", "2024-01-01")];
    const csv = generateCSV(entries);
    const parsed = parseCSV(csv);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe("e1");
  });

  it("should parse multiple entries", () => {
    const entries = [
      makeEntry("e1", "2024-01-01"),
      makeEntry("e2", "2024-01-02"),
      makeEntry("e3", "2024-01-03")
    ];
    const csv = generateCSV(entries);
    const parsed = parseCSV(csv);
    expect(parsed).toHaveLength(3);
  });

  it("should set clockOut to null for open entries", () => {
    const csv = generateCSV([makeEntry("open", "2024-01-01", null)]);
    const parsed = parseCSV(csv);
    expect(parsed[0].clockOut).toBeNull();
  });

  it("should preserve notes", () => {
    const entry = { ...makeEntry("e1", "2024-01-01"), notes: "Worked late" };
    const csv = generateCSV([entry]);
    const parsed = parseCSV(csv);
    expect(parsed[0].notes).toBe("Worked late");
  });

  it("should return null for unrecognized CSV format", () => {
    expect(parseCSV("not,a,valid,entries,csv\n1,2,3,4,5")).toBeNull();
  });
});

// ── Import — parseMetaDataCSV ─────────────────────────────────────────────────

describe("Import metadata (parseMetaDataCSV)", () => {
  it("should parse a valid metadata CSV", () => {
    const csv = generateMetaDataCSV(getDefaultMetaData());
    const parsed = parseMetaDataCSV(csv);
    expect(parsed).not.toBeNull();
    expect(parsed.baseHourlyRate).toBe(23.49);
  });

  it("should convert numeric fields to numbers", () => {
    const csv = '"key","value"\n"overtimeMultiplier","1.75"\n"sundayPremiumPercent","30"';
    const parsed = parseMetaDataCSV(csv);
    expect(typeof parsed.overtimeMultiplier).toBe("number");
    expect(typeof parsed.sundayPremiumPercent).toBe("number");
  });

  it("should keep time strings as strings", () => {
    const csv = '"key","value"\n"nightDiffStartTime","20:00"';
    const parsed = parseMetaDataCSV(csv);
    expect(typeof parsed.nightDiffStartTime).toBe("string");
    expect(parsed.nightDiffStartTime).toBe("20:00");
  });

  it("should return null for empty input", () => {
    expect(parseMetaDataCSV("")).toBeNull();
  });

  it("should return null for wrong header", () => {
    expect(parseMetaDataCSV('"id","date","clockIn"\n"e1","Jan 1",""')).toBeNull();
  });
});

// ── Import — parseAllDataCSV ──────────────────────────────────────────────────

describe("Import all data (parseAllDataCSV)", () => {
  it("should parse both entries and metadata", () => {
    const entries = [makeEntry("e1", "2024-01-01", "2024-01-01")];
    const meta = getDefaultMetaData();
    const csv = generateAllDataCSV(entries, meta);
    const result = parseAllDataCSV(csv);
    expect(result).not.toBeNull();
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].id).toBe("e1");
    expect(result.meta.baseHourlyRate).toBe(meta.baseHourlyRate);
  });

  it("should parse a file with only metadata (no entry rows)", () => {
    const csv = generateAllDataCSV([], getDefaultMetaData());
    const result = parseAllDataCSV(csv);
    expect(result.entries).toHaveLength(0);
    expect(result.meta.overtimeMultiplier).toBe(1.5);
  });

  it("should parse a file with only entries (no meta rows)", () => {
    const entries = [makeEntry("e1", "2024-01-01")];
    const csv = generateAllDataCSV(entries, {});
    const result = parseAllDataCSV(csv);
    expect(result.entries).toHaveLength(1);
    expect(result.meta).toEqual({});
  });

  it("should handle multiple entries correctly", () => {
    const entries = [
      makeEntry("e1", "2024-01-01"),
      makeEntry("e2", "2024-01-02"),
      makeEntry("e3", "2024-01-03")
    ];
    const csv = generateAllDataCSV(entries, getDefaultMetaData());
    const result = parseAllDataCSV(csv);
    expect(result.entries).toHaveLength(3);
    const ids = result.entries.map((e) => e.id);
    expect(ids).toContain("e1");
    expect(ids).toContain("e2");
    expect(ids).toContain("e3");
  });

  it("should return null for empty input", () => {
    expect(parseAllDataCSV("")).toBeNull();
  });

  it("should return null for a CSV without the type column", () => {
    const entriesOnlyCSV = generateCSV([makeEntry("e1", "2024-01-01")]);
    expect(parseAllDataCSV(entriesOnlyCSV)).toBeNull();
  });
});

// ── Import from storage — merge vs. replace ───────────────────────────────────

describe("Import merge vs. replace (via storage functions)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("merge: should add new entries without removing existing ones", () => {
    const existing = [makeEntry("old", "2024-01-01")];
    saveEntries(existing);

    const incoming = [makeEntry("new", "2024-01-05")];
    const merged = mergeEntries(loadEntries(), incoming);
    saveEntries(merged);

    const stored = loadEntries();
    expect(stored).toHaveLength(2);
    expect(stored.map((e) => e.id)).toContain("old");
    expect(stored.map((e) => e.id)).toContain("new");
  });

  it("merge: should skip duplicate entries (same id)", () => {
    const existing = [makeEntry("dup", "2024-01-01", "2024-01-01")];
    saveEntries(existing);

    const incoming = [makeEntry("dup", "2024-01-01", "2024-01-01")];
    const merged = mergeEntries(loadEntries(), incoming);
    saveEntries(merged);

    expect(loadEntries()).toHaveLength(1);
  });

  it("replace: should remove all existing entries and store the new ones", () => {
    const existing = [makeEntry("old1", "2024-01-01"), makeEntry("old2", "2024-01-02")];
    saveEntries(existing);

    const replacement = [makeEntry("new1", "2024-01-10")];
    saveEntries(replacement); // replace = overwrite

    const stored = loadEntries();
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe("new1");
  });

  it("merge metadata: should overlay incoming values over existing ones", () => {
    saveMetaData({ ...getDefaultMetaData(), baseHourlyRate: 23.49 });

    const incoming = { baseHourlyRate: 30.0 };
    saveMetaData({ ...loadMetaData(), ...incoming });

    expect(loadMetaData().baseHourlyRate).toBe(30.0);
    // Other fields should remain
    expect(loadMetaData().overtimeMultiplier).toBe(1.5);
  });

  it("replace metadata: should store exactly the incoming metadata object", () => {
    saveMetaData({ ...getDefaultMetaData() });
    const replacement = { baseHourlyRate: 35.0 };
    saveMetaData(replacement);
    expect(loadMetaData().baseHourlyRate).toBe(35.0);
  });
});

// ── Cross-format import compatibility ─────────────────────────────────────────

describe("Cross-format import compatibility", () => {
  it("should correctly detect and parse an entries CSV regardless of which page exported it", () => {
    const entries = [makeEntry("e1", "2024-01-01", "2024-01-01")];
    const csv = generateCSV(entries);
    expect(detectCSVType(csv)).toBe("entries");
    const parsed = parseCSV(csv);
    expect(parsed).toHaveLength(1);
  });

  it("should correctly detect and parse a metadata CSV regardless of which page exported it", () => {
    const csv = generateMetaDataCSV(getDefaultMetaData());
    expect(detectCSVType(csv)).toBe("metadata");
    const parsed = parseMetaDataCSV(csv);
    expect(parsed).not.toBeNull();
  });

  it("should correctly detect and parse an all-data CSV regardless of which page exported it", () => {
    const entries = [makeEntry("e1", "2024-01-01")];
    const csv = generateAllDataCSV(entries, getDefaultMetaData());
    expect(detectCSVType(csv)).toBe("all");
    const result = parseAllDataCSV(csv);
    expect(result.entries).toHaveLength(1);
    expect(result.meta.baseHourlyRate).toBe(23.49);
  });
});
