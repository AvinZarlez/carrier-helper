/**
 * common.test.js — Unit tests for common.js utilities
 *
 * Tests cover:
 * - Storage operations (loadEntries, saveEntries)
 * - Formatting helpers (formatDate, formatTime, formatDuration)
 * - CSV utilities (parseCSV, splitCSVLine, generateCSV)
 * - Entry operations (mergeEntries, getOpenEntry, createEntry, clockOutEntry)
 */

const {
  STORAGE_KEY,
  loadEntries,
  saveEntries,
  getOpenEntry,
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
  createEntry,
  clockOutEntry
} = require('../js/common.js');

describe('Storage Operations', () => {
  describe('loadEntries', () => {
    it('should return empty array when localStorage is empty', () => {
      const entries = loadEntries();
      expect(entries).toEqual([]);
    });

    it('should return parsed entries from localStorage', () => {
      const testEntries = [
        { id: '1', clockIn: '2024-01-01T09:00:00.000Z', clockOut: '2024-01-01T17:00:00.000Z' }
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(testEntries));
      
      const entries = loadEntries();
      expect(entries).toEqual(testEntries);
    });

    it('should return empty array on invalid JSON', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid json');
      
      const entries = loadEntries();
      expect(entries).toEqual([]);
    });
  });

  describe('saveEntries', () => {
    it('should save entries to localStorage', () => {
      const testEntries = [
        { id: '1', clockIn: '2024-01-01T09:00:00.000Z', clockOut: null }
      ];
      
      saveEntries(testEntries);
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify(testEntries)
      );
    });

    it('should sort entries by clockIn before saving', () => {
      const unsorted = [
        { id: '2', clockIn: '2024-01-02T09:00:00.000Z', clockOut: null },
        { id: '1', clockIn: '2024-01-01T09:00:00.000Z', clockOut: null }
      ];
      const sorted = [
        { id: '1', clockIn: '2024-01-01T09:00:00.000Z', clockOut: null },
        { id: '2', clockIn: '2024-01-02T09:00:00.000Z', clockOut: null }
      ];

      saveEntries(unsorted);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify(sorted)
      );
    });
  });

  describe('getOpenEntry', () => {
    it('should return null for empty array', () => {
      expect(getOpenEntry([])).toBeNull();
    });

    it('should return null when all entries are clocked out', () => {
      const entries = [
        { id: '1', clockIn: '2024-01-01T09:00:00.000Z', clockOut: '2024-01-01T17:00:00.000Z' }
      ];
      expect(getOpenEntry(entries)).toBeNull();
    });

    it('should return the open entry', () => {
      const openEntry = { id: '2', clockIn: '2024-01-02T09:00:00.000Z', clockOut: null };
      const entries = [
        { id: '1', clockIn: '2024-01-01T09:00:00.000Z', clockOut: '2024-01-01T17:00:00.000Z' },
        openEntry
      ];
      expect(getOpenEntry(entries)).toBe(openEntry);
    });
  });
});

describe('Formatting Helpers', () => {
  describe('formatDate', () => {
    it('should return empty string for empty input', () => {
      expect(formatDate('')).toBe('');
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
    });

    it('should format a valid ISO date string', () => {
      const result = formatDate('2024-01-15T09:00:00.000Z');
      // Result depends on locale, just verify it contains expected parts
      expect(result).toContain('2024');
      expect(result).toContain('15');
    });
  });

  describe('formatTime', () => {
    it('should return empty string for empty input', () => {
      expect(formatTime('')).toBe('');
      expect(formatTime(null)).toBe('');
      expect(formatTime(undefined)).toBe('');
    });

    it('should format a valid ISO time string', () => {
      const result = formatTime('2024-01-15T09:30:45.000Z');
      // Result depends on locale and timezone
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('formatDuration', () => {
    it('should return null when endIso is missing', () => {
      expect(formatDuration('2024-01-01T09:00:00.000Z', null)).toBeNull();
      expect(formatDuration('2024-01-01T09:00:00.000Z', '')).toBeNull();
    });

    it('should format duration correctly for 8 hours', () => {
      const start = '2024-01-01T09:00:00.000Z';
      const end = '2024-01-01T17:00:00.000Z';
      expect(formatDuration(start, end)).toBe('08:00:00');
    });

    it('should format duration correctly for 1 hour 30 minutes 15 seconds', () => {
      const start = '2024-01-01T09:00:00.000Z';
      const end = '2024-01-01T10:30:15.000Z';
      expect(formatDuration(start, end)).toBe('01:30:15');
    });

    it('should handle zero duration', () => {
      const time = '2024-01-01T09:00:00.000Z';
      expect(formatDuration(time, time)).toBe('00:00:00');
    });
  });
});

describe('CSV Utilities', () => {
  describe('splitCSVLine', () => {
    it('should split simple CSV line', () => {
      expect(splitCSVLine('a,b,c')).toEqual(['a', 'b', 'c']);
    });

    it('should handle quoted fields', () => {
      expect(splitCSVLine('"hello","world"')).toEqual(['hello', 'world']);
    });

    it('should handle commas inside quotes', () => {
      expect(splitCSVLine('"hello, world","test"')).toEqual(['hello, world', 'test']);
    });

    it('should handle escaped quotes', () => {
      expect(splitCSVLine('"say ""hello""","test"')).toEqual(['say "hello"', 'test']);
    });

    it('should handle empty fields', () => {
      expect(splitCSVLine('a,,c')).toEqual(['a', '', 'c']);
    });
  });

  describe('parseCSV', () => {
    it('should return empty array for empty input', () => {
      expect(parseCSV('')).toEqual([]);
    });

    it('should return empty array for header-only input', () => {
      expect(parseCSV('id,date,clockIn,clockOut,duration')).toEqual([]);
    });

    it('should return null for unrecognized format', () => {
      expect(parseCSV('foo,bar,baz\n1,2,3')).toBeNull();
    });

    it('should parse valid CSV', () => {
      const csv = `"id","date","clockIn","clockOut","duration"
"test-id","Jan 1, 2024","2024-01-01T09:00:00.000Z","2024-01-01T17:00:00.000Z","08:00:00"`;
      
      const result = parseCSV(csv);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('test-id');
      expect(result[0].clockIn).toBe('2024-01-01T09:00:00.000Z');
      expect(result[0].clockOut).toBe('2024-01-01T17:00:00.000Z');
    });

    it('should handle entries with null clockOut', () => {
      const csv = `"id","date","clockIn","clockOut","duration"
"test-id","Jan 1, 2024","2024-01-01T09:00:00.000Z","",""`;
      
      const result = parseCSV(csv);
      expect(result).toHaveLength(1);
      expect(result[0].clockOut).toBeNull();
    });
  });

  describe('generateCSV', () => {
    it('should generate header-only CSV for empty entries', () => {
      const csv = generateCSV([]);
      expect(csv).toBe('"id","date","clockIn","clockOut","duration","notes"');
    });

    it('should generate valid CSV with entries', () => {
      const entries = [
        { id: 'test-id', clockIn: '2024-01-01T09:00:00.000Z', clockOut: '2024-01-01T17:00:00.000Z', notes: 'test note' }
      ];
      
      const csv = generateCSV(entries);
      expect(csv).toContain('"test-id"');
      expect(csv).toContain('"2024-01-01T09:00:00.000Z"');
      expect(csv).toContain('"08:00:00"');
      expect(csv).toContain('"test note"');
    });

    it('should escape quotes in values', () => {
      const entries = [
        { id: 'test"id', clockIn: '2024-01-01T09:00:00.000Z', clockOut: null }
      ];
      
      const csv = generateCSV(entries);
      expect(csv).toContain('"test""id"');
    });
  });
});

describe('Entry Operations', () => {
  describe('mergeEntries', () => {
    it('should return empty array for empty inputs', () => {
      expect(mergeEntries([], [])).toEqual([]);
    });

    it('should merge entries without duplicates', () => {
      const existing = [
        { id: '1', clockIn: '2024-01-01T09:00:00.000Z', clockOut: '2024-01-01T17:00:00.000Z' }
      ];
      const incoming = [
        { id: '2', clockIn: '2024-01-02T09:00:00.000Z', clockOut: '2024-01-02T17:00:00.000Z' }
      ];
      
      const result = mergeEntries(existing, incoming);
      expect(result).toHaveLength(2);
    });

    it('should deduplicate by id (incoming takes precedence)', () => {
      const existing = [
        { id: '1', clockIn: '2024-01-01T09:00:00.000Z', clockOut: null }
      ];
      const incoming = [
        { id: '1', clockIn: '2024-01-01T09:00:00.000Z', clockOut: '2024-01-01T17:00:00.000Z' }
      ];
      
      const result = mergeEntries(existing, incoming);
      expect(result).toHaveLength(1);
      expect(result[0].clockOut).toBe('2024-01-01T17:00:00.000Z');
    });

    it('should sort by clockIn date', () => {
      const existing = [
        { id: '2', clockIn: '2024-01-02T09:00:00.000Z', clockOut: null }
      ];
      const incoming = [
        { id: '1', clockIn: '2024-01-01T09:00:00.000Z', clockOut: null }
      ];
      
      const result = mergeEntries(existing, incoming);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });
  });

  describe('validateEntry', () => {
    it('should return true for a valid complete entry', () => {
      const entry = { id: 'abc', clockIn: '2024-01-01T09:00:00.000Z', clockOut: '2024-01-01T17:00:00.000Z', notes: 'ok' };
      expect(validateEntry(entry)).toBe(true);
    });

    it('should return true for a valid open entry (null clockOut)', () => {
      const entry = { id: 'abc', clockIn: '2024-01-01T09:00:00.000Z', clockOut: null };
      expect(validateEntry(entry)).toBe(true);
    });

    it('should return true when notes is absent', () => {
      const entry = { id: 'abc', clockIn: '2024-01-01T09:00:00.000Z', clockOut: null };
      expect(validateEntry(entry)).toBe(true);
    });

    it('should return false when id is missing', () => {
      const entry = { id: '', clockIn: '2024-01-01T09:00:00.000Z', clockOut: null };
      expect(validateEntry(entry)).toBe(false);
    });

    it('should return false when clockIn is invalid', () => {
      const entry = { id: 'abc', clockIn: 'not-a-date', clockOut: null };
      expect(validateEntry(entry)).toBe(false);
    });

    it('should return false when clockOut is before clockIn', () => {
      const entry = { id: 'abc', clockIn: '2024-01-01T17:00:00.000Z', clockOut: '2024-01-01T09:00:00.000Z' };
      expect(validateEntry(entry)).toBe(false);
    });

    it('should return false when clockOut equals clockIn', () => {
      const entry = { id: 'abc', clockIn: '2024-01-01T09:00:00.000Z', clockOut: '2024-01-01T09:00:00.000Z' };
      expect(validateEntry(entry)).toBe(false);
    });

    it('should return false when clockOut is invalid', () => {
      const entry = { id: 'abc', clockIn: '2024-01-01T09:00:00.000Z', clockOut: 'bad-date' };
      expect(validateEntry(entry)).toBe(false);
    });

    it('should return false when notes is not a string', () => {
      const entry = { id: 'abc', clockIn: '2024-01-01T09:00:00.000Z', clockOut: null, notes: 123 };
      expect(validateEntry(entry)).toBe(false);
    });

    it('should return false for null input', () => {
      expect(validateEntry(null)).toBe(false);
    });
  });

  describe('createEntry', () => {
    it('should create entry with unique id', () => {
      const entry = createEntry();
      expect(entry.id).toBeDefined();
      expect(entry.id.startsWith('test-uuid-')).toBe(true);
    });

    it('should create entry with clockIn timestamp', () => {
      const before = new Date().toISOString();
      const entry = createEntry();
      const after = new Date().toISOString();
      
      expect(entry.clockIn).toBeDefined();
      expect(entry.clockIn >= before).toBe(true);
      expect(entry.clockIn <= after).toBe(true);
    });

    it('should create entry with null clockOut', () => {
      const entry = createEntry();
      expect(entry.clockOut).toBeNull();
    });

    it('should create entry with empty notes', () => {
      const entry = createEntry();
      expect(entry.notes).toBe('');
    });
  });

  describe('clockOutEntry', () => {
    it('should set clockOut to current time', () => {
      const entry = { id: '1', clockIn: '2024-01-01T09:00:00.000Z', clockOut: null };
      const before = new Date().toISOString();
      
      clockOutEntry(entry);
      
      const after = new Date().toISOString();
      expect(entry.clockOut).toBeDefined();
      expect(entry.clockOut >= before).toBe(true);
      expect(entry.clockOut <= after).toBe(true);
    });
  });
});

describe('Cross-entry Validation', () => {
  const A = { id: 'a', clockIn: '2024-01-01T09:00:00.000Z', clockOut: '2024-01-01T10:00:00.000Z' };
  const B = { id: 'b', clockIn: '2024-01-01T10:00:00.000Z', clockOut: '2024-01-01T11:00:00.000Z' };
  const C = { id: 'c', clockIn: '2024-01-01T09:30:00.000Z', clockOut: '2024-01-01T10:30:00.000Z' }; // overlaps A and B
  const D = { id: 'd', clockIn: '2024-01-01T11:00:00.000Z', clockOut: null }; // open, after B
  const E = { id: 'e', clockIn: '2024-01-01T09:00:00.000Z', clockOut: null }; // open, same start as A

  describe('validateNoOverlap', () => {
    it('should return true when there are no other entries', () => {
      expect(validateNoOverlap(A, [A])).toBe(true);
    });

    it('should return true for adjacent (non-overlapping) entries', () => {
      // A ends at 10:00, B starts at 10:00 — touching but not overlapping
      expect(validateNoOverlap(A, [A, B])).toBe(true);
      expect(validateNoOverlap(B, [A, B])).toBe(true);
    });

    it('should return false when entry overlaps another', () => {
      expect(validateNoOverlap(C, [A, B, C])).toBe(false);
    });

    it('should return false when a new entry overlaps an open entry', () => {
      // B (10:00–11:00) overlaps D which starts at 11:00 — touching, not overlapping
      expect(validateNoOverlap(B, [A, B, D])).toBe(true);
      // C (9:30–10:30) overlaps open E (starts 9:00, no end)
      expect(validateNoOverlap(C, [E, C])).toBe(false);
    });

    it('should return false when two open entries exist', () => {
      const open1 = { id: 'o1', clockIn: '2024-01-01T08:00:00.000Z', clockOut: null };
      const open2 = { id: 'o2', clockIn: '2024-01-01T09:00:00.000Z', clockOut: null };
      expect(validateNoOverlap(open2, [open1, open2])).toBe(false);
    });

    it('should return true for empty entries list', () => {
      expect(validateNoOverlap(A, [])).toBe(true);
    });
  });

  describe('validateSingleOpenEntry', () => {
    it('should return true for a completed entry regardless of others', () => {
      expect(validateSingleOpenEntry(A, [A, B, D])).toBe(true);
    });

    it('should return true when open entry is the last entry', () => {
      expect(validateSingleOpenEntry(D, [A, B, D])).toBe(true);
    });

    it('should return false when open entry has newer entries after it', () => {
      // E starts at 9:00, B starts at 10:00 — B is after E, so E cannot be open
      expect(validateSingleOpenEntry(E, [A, B, E])).toBe(false);
    });

    it('should return true when open entry is the only entry', () => {
      const open = { id: 'x', clockIn: '2024-01-01T09:00:00.000Z', clockOut: null };
      expect(validateSingleOpenEntry(open, [open])).toBe(true);
    });
  });
});
