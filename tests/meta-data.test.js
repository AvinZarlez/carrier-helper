/**
 * meta-data.test.js — Unit tests for metadata utilities in common.js
 *
 * Tests cover:
 * - Default metadata (getDefaultMetaData)
 * - Metadata storage (loadMetaData, saveMetaData)
 * - Metadata CSV (generateMetaDataCSV, parseMetaDataCSV)
 * - CSV type detection (detectCSVType)
 * - Combined all-data CSV (generateAllDataCSV, parseAllDataCSV)
 */

const {
  META_STORAGE_KEY,
  getDefaultMetaData,
  loadMetaData,
  saveMetaData,
  generateMetaDataCSV,
  parseMetaDataCSV,
  detectCSVType,
  generateAllDataCSV,
  parseAllDataCSV,
  generateCSV,
  parseCSV
} = require('../js/common.js');

// ── Default Metadata ────────────────────────────────────────────────────────

describe('getDefaultMetaData', () => {
  it('should return an object with all expected USPS pay scale fields', () => {
    const meta = getDefaultMetaData();
    expect(meta).toHaveProperty('baseHourlyRate');
    expect(meta).toHaveProperty('overtimeMultiplier');
    expect(meta).toHaveProperty('penaltyOvertimeMultiplier');
    expect(meta).toHaveProperty('nightDifferentialRate');
    expect(meta).toHaveProperty('sundayPremiumPercent');
    expect(meta).toHaveProperty('dailyOvertimeThresholdHours');
    expect(meta).toHaveProperty('dailyPenaltyOTThresholdHours');
    expect(meta).toHaveProperty('weeklyOvertimeThresholdHours');
    expect(meta).toHaveProperty('weeklyPenaltyOTThresholdHours');
    expect(meta).toHaveProperty('nightDiffStartTime');
    expect(meta).toHaveProperty('nightDiffEndTime');
  });

  it('should have correct USPS default values', () => {
    const meta = getDefaultMetaData();
    expect(meta.baseHourlyRate).toBe(23.49);
    expect(meta.overtimeMultiplier).toBe(1.5);
    expect(meta.penaltyOvertimeMultiplier).toBe(2.0);
    expect(meta.nightDifferentialRate).toBe(1.08);
    expect(meta.sundayPremiumPercent).toBe(25);
    expect(meta.dailyOvertimeThresholdHours).toBe(8);
    expect(meta.dailyPenaltyOTThresholdHours).toBe(10);
    expect(meta.weeklyOvertimeThresholdHours).toBe(40);
    expect(meta.weeklyPenaltyOTThresholdHours).toBe(56);
    expect(meta.nightDiffStartTime).toBe('18:00');
    expect(meta.nightDiffEndTime).toBe('06:00');
  });

  it('should return a fresh object each time', () => {
    const a = getDefaultMetaData();
    const b = getDefaultMetaData();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

// ── Metadata Storage ────────────────────────────────────────────────────────

describe('loadMetaData', () => {
  it('should return defaults when localStorage is empty', () => {
    expect(loadMetaData()).toEqual(getDefaultMetaData());
  });

  it('should return stored metadata merged with defaults', () => {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify({ baseHourlyRate: 30 }));
    const meta = loadMetaData();
    expect(meta.baseHourlyRate).toBe(30);
    // Other fields should be defaults
    expect(meta.overtimeMultiplier).toBe(1.5);
  });

  it('should return defaults on invalid JSON', () => {
    localStorage.setItem(META_STORAGE_KEY, 'bad json');
    expect(loadMetaData()).toEqual(getDefaultMetaData());
  });

  it('should return defaults when stored value is not an object', () => {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify('a string'));
    expect(loadMetaData()).toEqual(getDefaultMetaData());
  });
});

describe('saveMetaData', () => {
  it('should save metadata to localStorage', () => {
    const meta = { baseHourlyRate: 25 };
    saveMetaData(meta);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      META_STORAGE_KEY,
      JSON.stringify(meta)
    );
  });
});

// ── Metadata CSV ────────────────────────────────────────────────────────────

describe('generateMetaDataCSV', () => {
  it('should generate CSV with key/value header', () => {
    const csv = generateMetaDataCSV({ baseHourlyRate: 23.49 });
    const lines = csv.split('\n');
    expect(lines[0]).toBe('"key","value"');
    expect(lines[1]).toBe('"baseHourlyRate","23.49"');
  });

  it('should include all metadata keys', () => {
    const meta = getDefaultMetaData();
    const csv = generateMetaDataCSV(meta);
    const lines = csv.split('\n');
    // Header + one line per key
    expect(lines.length).toBe(1 + Object.keys(meta).length);
  });
});

describe('parseMetaDataCSV', () => {
  it('should return null for empty input', () => {
    expect(parseMetaDataCSV('')).toBeNull();
  });

  it('should return null for unrecognized header', () => {
    expect(parseMetaDataCSV('foo,bar\n1,2')).toBeNull();
  });

  it('should parse a valid metadata CSV', () => {
    const csv = '"key","value"\n"baseHourlyRate","30"\n"nightDiffStartTime","20:00"';
    const result = parseMetaDataCSV(csv);
    expect(result).not.toBeNull();
    expect(result.baseHourlyRate).toBe(30);
    expect(result.nightDiffStartTime).toBe('20:00');
  });

  it('should convert numeric keys to numbers', () => {
    const csv = '"key","value"\n"overtimeMultiplier","1.75"';
    const result = parseMetaDataCSV(csv);
    expect(typeof result.overtimeMultiplier).toBe('number');
    expect(result.overtimeMultiplier).toBe(1.75);
  });

  it('should roundtrip with generateMetaDataCSV', () => {
    const original = getDefaultMetaData();
    const csv = generateMetaDataCSV(original);
    const parsed = parseMetaDataCSV(csv);
    expect(parsed).toEqual(original);
  });
});

// ── CSV Type Detection ──────────────────────────────────────────────────────

describe('detectCSVType', () => {
  it('should detect time entries CSV', () => {
    const csv = '"id","date","clockIn","clockOut","duration","notes"\n"1","Jan 1","2024-01-01T09:00:00.000Z","","",""';
    expect(detectCSVType(csv)).toBe('entries');
  });

  it('should detect metadata CSV', () => {
    const csv = '"key","value"\n"baseHourlyRate","23.49"';
    expect(detectCSVType(csv)).toBe('metadata');
  });

  it('should detect all-data CSV', () => {
    const csv = '"type","key","value","id","date","clockIn","clockOut","duration","notes"\n"meta","baseHourlyRate","23.49","","","","","",""';
    expect(detectCSVType(csv)).toBe('all');
  });

  it('should return unknown for unrecognized format', () => {
    expect(detectCSVType('foo,bar\n1,2')).toBe('unknown');
  });

  it('should return unknown for empty input', () => {
    expect(detectCSVType('')).toBe('unknown');
  });
});

// ── Combined All-Data CSV ───────────────────────────────────────────────────

describe('generateAllDataCSV', () => {
  it('should include both metadata and entries', () => {
    const entries = [
      { id: 'e1', clockIn: '2024-01-01T09:00:00.000Z', clockOut: '2024-01-01T17:00:00.000Z', notes: '' }
    ];
    const meta = { baseHourlyRate: 25, nightDiffStartTime: '18:00' };
    const csv = generateAllDataCSV(entries, meta);
    const lines = csv.split('\n');

    // Header + 2 meta rows + 1 entry row
    expect(lines.length).toBe(4);
    expect(lines[0]).toContain('"type"');
    expect(lines[1]).toContain('"meta"');
    expect(lines[3]).toContain('"entry"');
  });

  it('should handle empty entries with metadata', () => {
    const csv = generateAllDataCSV([], { baseHourlyRate: 25 });
    const lines = csv.split('\n');
    expect(lines.length).toBe(2); // header + 1 meta row
  });

  it('should handle entries with empty metadata', () => {
    const entries = [
      { id: 'e1', clockIn: '2024-01-01T09:00:00.000Z', clockOut: null, notes: '' }
    ];
    const csv = generateAllDataCSV(entries, {});
    const lines = csv.split('\n');
    expect(lines.length).toBe(2); // header + 1 entry row
  });
});

describe('parseAllDataCSV', () => {
  it('should return null for empty input', () => {
    expect(parseAllDataCSV('')).toBeNull();
  });

  it('should parse both metadata and entries', () => {
    const entries = [
      { id: 'e1', clockIn: '2024-01-01T09:00:00.000Z', clockOut: '2024-01-01T17:00:00.000Z', notes: 'test' }
    ];
    const meta = getDefaultMetaData();
    const csv = generateAllDataCSV(entries, meta);
    const result = parseAllDataCSV(csv);

    expect(result).not.toBeNull();
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].id).toBe('e1');
    expect(result.entries[0].notes).toBe('test');
    expect(result.meta.baseHourlyRate).toBe(meta.baseHourlyRate);
  });

  it('should roundtrip all data', () => {
    const entries = [
      { id: 'a', clockIn: '2024-01-01T09:00:00.000Z', clockOut: '2024-01-01T17:00:00.000Z', notes: '' },
      { id: 'b', clockIn: '2024-01-02T09:00:00.000Z', clockOut: null, notes: 'open' }
    ];
    const meta = getDefaultMetaData();
    const csv = generateAllDataCSV(entries, meta);
    const result = parseAllDataCSV(csv);

    expect(result.entries).toHaveLength(2);
    expect(result.meta).toEqual(meta);
  });

  it('should handle missing clockOut entries', () => {
    const csv = '"type","key","value","id","date","clockIn","clockOut","duration","notes"\n"entry","","","e1","","2024-01-01T09:00:00.000Z","","",""';
    const result = parseAllDataCSV(csv);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].clockOut).toBeNull();
  });
});

// ── Cross-format Import Compatibility ───────────────────────────────────────

describe('Cross-format import compatibility', () => {
  it('should import time entries CSV from either page', () => {
    const entries = [
      { id: 'e1', clockIn: '2024-01-01T09:00:00.000Z', clockOut: '2024-01-01T17:00:00.000Z', notes: '' }
    ];
    const csv = generateCSV(entries);
    expect(detectCSVType(csv)).toBe('entries');
    const parsed = parseCSV(csv);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe('e1');
  });

  it('should import metadata CSV from either page', () => {
    const meta = getDefaultMetaData();
    const csv = generateMetaDataCSV(meta);
    expect(detectCSVType(csv)).toBe('metadata');
    const parsed = parseMetaDataCSV(csv);
    expect(parsed).toEqual(meta);
  });

  it('should import all-data CSV from either page', () => {
    const entries = [
      { id: 'e1', clockIn: '2024-01-01T09:00:00.000Z', clockOut: '2024-01-01T17:00:00.000Z', notes: '' }
    ];
    const meta = getDefaultMetaData();
    const csv = generateAllDataCSV(entries, meta);
    expect(detectCSVType(csv)).toBe('all');
    const result = parseAllDataCSV(csv);
    expect(result.entries).toHaveLength(1);
    expect(result.meta).toEqual(meta);
  });
});
