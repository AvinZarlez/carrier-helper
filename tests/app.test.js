/**
 * app.test.js — Unit tests for app.js URL parameter handling
 *
 * Tests cover:
 * - handleUrlParams: automatic clock-in via ?clock-in=true
 * - handleUrlParams: automatic clock-out via ?clock-out=true
 * - handleUrlParams: no-op conditions (already clocked in, already clocked out)
 * - handleUrlParams: unrecognised / absent parameters
 */

// ── Mock globals used by app.js ────────────────────────────────────────────

const mockCreateEntry = jest.fn(() => ({
  id: "test-uuid",
  clockIn: "2026-02-27T12:00:00.000Z",
  clockOut: null
}));
const mockClockOutEntry = jest.fn((entry) => {
  entry.clockOut = new Date().toISOString();
});
const mockLoadEntries = jest.fn();
const mockSaveEntries = jest.fn();
const mockGetOpenEntry = jest.fn();
const mockRenderTimeEntries = jest.fn();
const mockInitTimeEntriesView = jest.fn();
const mockInitHoursView = jest.fn();
const mockShowTab = jest.fn();

global.createEntry = mockCreateEntry;
global.clockOutEntry = mockClockOutEntry;
global.loadEntries = mockLoadEntries;
global.saveEntries = mockSaveEntries;
global.getOpenEntry = mockGetOpenEntry;
global.renderTimeEntries = mockRenderTimeEntries;
global.initTimeEntriesView = mockInitTimeEntriesView;
global.initHoursView = mockInitHoursView;
global.showTab = mockShowTab;

const { handleUrlParams, handlePageParam } = require("../js/app.js");

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeOpenEntry() {
  return { id: "open-uuid", clockIn: "2026-02-27T08:00:00.000Z", clockOut: null };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("handleUrlParams", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("?clock-in=true", () => {
    it("clocks in when no shift is in progress", () => {
      const entries = [];
      mockLoadEntries.mockReturnValue(entries);
      mockGetOpenEntry.mockReturnValue(null); // not clocked in

      handleUrlParams("?clock-in=true");

      expect(mockLoadEntries).toHaveBeenCalledTimes(1);
      expect(mockGetOpenEntry).toHaveBeenCalledWith(entries);
      expect(mockCreateEntry).toHaveBeenCalledTimes(1);
      expect(mockSaveEntries).toHaveBeenCalledTimes(1);
      expect(mockRenderTimeEntries).toHaveBeenCalledTimes(1);
    });

    it("does nothing when a shift is already in progress", () => {
      const open = makeOpenEntry();
      const entries = [open];
      mockLoadEntries.mockReturnValue(entries);
      mockGetOpenEntry.mockReturnValue(open); // already clocked in

      handleUrlParams("?clock-in=true");

      expect(mockCreateEntry).not.toHaveBeenCalled();
      expect(mockSaveEntries).not.toHaveBeenCalled();
      expect(mockRenderTimeEntries).not.toHaveBeenCalled();
    });
  });

  describe("?clock-out=true", () => {
    it("clocks out when a shift is in progress", () => {
      const open = makeOpenEntry();
      const entries = [open];
      mockLoadEntries.mockReturnValue(entries);
      mockGetOpenEntry.mockReturnValue(open);

      handleUrlParams("?clock-out=true");

      expect(mockLoadEntries).toHaveBeenCalledTimes(1);
      expect(mockGetOpenEntry).toHaveBeenCalledWith(entries);
      expect(mockClockOutEntry).toHaveBeenCalledWith(open);
      expect(mockSaveEntries).toHaveBeenCalledTimes(1);
      expect(mockRenderTimeEntries).toHaveBeenCalledTimes(1);
    });

    it("does nothing when not clocked in", () => {
      const entries = [];
      mockLoadEntries.mockReturnValue(entries);
      mockGetOpenEntry.mockReturnValue(null); // not clocked in

      handleUrlParams("?clock-out=true");

      expect(mockClockOutEntry).not.toHaveBeenCalled();
      expect(mockSaveEntries).not.toHaveBeenCalled();
      expect(mockRenderTimeEntries).not.toHaveBeenCalled();
    });
  });

  describe("no relevant parameters", () => {
    it("does nothing when the search string is empty", () => {
      handleUrlParams("");

      expect(mockLoadEntries).not.toHaveBeenCalled();
      expect(mockSaveEntries).not.toHaveBeenCalled();
      expect(mockRenderTimeEntries).not.toHaveBeenCalled();
    });

    it("does nothing for unrelated parameters", () => {
      handleUrlParams("?foo=bar");

      expect(mockLoadEntries).not.toHaveBeenCalled();
      expect(mockSaveEntries).not.toHaveBeenCalled();
      expect(mockRenderTimeEntries).not.toHaveBeenCalled();
    });

    it("does nothing when clock-in is not 'true'", () => {
      handleUrlParams("?clock-in=1");

      expect(mockLoadEntries).not.toHaveBeenCalled();
    });

    it("does nothing when clock-out is not 'true'", () => {
      handleUrlParams("?clock-out=yes");

      expect(mockLoadEntries).not.toHaveBeenCalled();
    });
  });

  describe("both parameters present", () => {
    it("clock-in takes precedence when both are set and not clocked in", () => {
      const entries = [];
      mockLoadEntries.mockReturnValue(entries);
      mockGetOpenEntry.mockReturnValue(null);

      handleUrlParams("?clock-in=true&clock-out=true");

      expect(mockCreateEntry).toHaveBeenCalledTimes(1);
      expect(mockClockOutEntry).not.toHaveBeenCalled();
    });
  });
});

describe("handlePageParam", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("navigates to hours-view when page=hour", () => {
    handlePageParam("?page=hour");
    expect(mockShowTab).toHaveBeenCalledWith("hours-view");
  });

  it("navigates to data-viewer when page=data", () => {
    handlePageParam("?page=data");
    expect(mockShowTab).toHaveBeenCalledWith("data-viewer");
  });

  it("navigates to about when page=about", () => {
    handlePageParam("?page=about");
    expect(mockShowTab).toHaveBeenCalledWith("about");
  });

  it("does nothing when page parameter is absent", () => {
    handlePageParam("");
    expect(mockShowTab).not.toHaveBeenCalled();
  });

  it("does nothing for unrecognised page values", () => {
    handlePageParam("?page=unknown");
    expect(mockShowTab).not.toHaveBeenCalled();
  });

  it("does nothing when search has unrelated parameters only", () => {
    handlePageParam("?foo=bar");
    expect(mockShowTab).not.toHaveBeenCalled();
  });

  it("works alongside other URL parameters", () => {
    handlePageParam("?clock-in=true&page=hour");
    expect(mockShowTab).toHaveBeenCalledWith("hours-view");
  });
});
