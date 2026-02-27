/**
 * tab-navigation.test.js — Unit tests for tab-navigation.js
 *
 * Tests cover:
 * - showTab: clearSelection is called for all non-data-viewer tabs
 * - showTab: clearSelection is NOT called when switching to data-viewer
 * - showTab: correct view elements are shown/hidden
 * - showTab: correct nav buttons are marked active
 * - showSubTab: clearSelection is called when switching to meta-data
 * - showSubTab: clearSelection is NOT called when switching to time-entries
 */

// ── Mock DOM elements ──────────────────────────────────────────────────────

function mockElement(id) {
  return {
    id,
    style: { display: "" },
    classList: {
      _classes: new Set(),
      add(cls) { this._classes.add(cls); },
      remove(cls) { this._classes.delete(cls); },
      contains(cls) { return this._classes.has(cls); },
      toggle(cls, force) {
        if (force !== undefined) {
          if (force) this._classes.add(cls);
          else this._classes.delete(cls);
          return force;
        }
        if (this._classes.has(cls)) { this._classes.delete(cls); return false; }
        this._classes.add(cls);
        return true;
      }
    },
    addEventListener: jest.fn(),
    setAttribute: jest.fn()
  };
}

const elements = {};
const elementIds = [
  "nav-time-entries", "nav-data-viewer", "nav-hours-view", "nav-about",
  "time-entries-view", "data-viewer-view", "hours-view", "about-view",
  "dv-sub-time-entries", "dv-sub-meta-data",
  "dv-time-entries-sub", "dv-meta-data-sub",
  "data-mgmt-body", "data-mgmt-toggle"
];
elementIds.forEach((id) => { elements[id] = mockElement(id); });

document.getElementById = jest.fn((id) => elements[id]);

// ── Mock globals used by tab-navigation.js ─────────────────────────────────

const mockClearSelection = jest.fn();
const mockRenderDataViewer = jest.fn();
const mockRenderMetaDataForm = jest.fn();
const mockRenderHoursView = jest.fn();

global.clearSelection = mockClearSelection;
global.renderDataViewer = mockRenderDataViewer;
global.renderMetaDataForm = mockRenderMetaDataForm;
global.renderHoursView = mockRenderHoursView;

const { showTab, showSubTab } = require("../js/tab-navigation.js");

// ── Helpers ─────────────────────────────────────────────────────────────────

function resetElements() {
  elementIds.forEach((id) => {
    elements[id].style.display = "";
    elements[id].classList._classes.clear();
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("showTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetElements();
  });

  describe("clearSelection behavior", () => {
    it("calls clearSelection when switching to time-entries", () => {
      showTab("time-entries");
      expect(mockClearSelection).toHaveBeenCalledTimes(1);
    });

    it("calls clearSelection when switching to hours-view", () => {
      showTab("hours-view");
      expect(mockClearSelection).toHaveBeenCalledTimes(1);
    });

    it("calls clearSelection when switching to about", () => {
      showTab("about");
      expect(mockClearSelection).toHaveBeenCalledTimes(1);
    });

    it("does NOT call clearSelection when switching to data-viewer", () => {
      showTab("data-viewer");
      expect(mockClearSelection).not.toHaveBeenCalled();
    });
  });

  describe("view visibility", () => {
    it("shows only time-entries-view for time-entries tab", () => {
      showTab("time-entries");
      expect(elements["time-entries-view"].style.display).toBe("block");
      expect(elements["data-viewer-view"].style.display).toBe("none");
      expect(elements["hours-view"].style.display).toBe("none");
      expect(elements["about-view"].style.display).toBe("none");
    });

    it("shows only data-viewer-view for data-viewer tab", () => {
      showTab("data-viewer");
      expect(elements["data-viewer-view"].style.display).toBe("block");
      expect(elements["time-entries-view"].style.display).toBe("none");
      expect(elements["hours-view"].style.display).toBe("none");
      expect(elements["about-view"].style.display).toBe("none");
    });

    it("shows only hours-view for hours-view tab", () => {
      showTab("hours-view");
      expect(elements["hours-view"].style.display).toBe("block");
      expect(elements["time-entries-view"].style.display).toBe("none");
      expect(elements["data-viewer-view"].style.display).toBe("none");
      expect(elements["about-view"].style.display).toBe("none");
    });

    it("shows only about-view for about tab", () => {
      showTab("about");
      expect(elements["about-view"].style.display).toBe("block");
      expect(elements["time-entries-view"].style.display).toBe("none");
      expect(elements["data-viewer-view"].style.display).toBe("none");
      expect(elements["hours-view"].style.display).toBe("none");
    });
  });

  describe("nav button active state", () => {
    it("marks nav-time-entries active for time-entries tab", () => {
      showTab("time-entries");
      expect(elements["nav-time-entries"].classList.contains("active")).toBe(true);
      expect(elements["nav-data-viewer"].classList.contains("active")).toBe(false);
      expect(elements["nav-hours-view"].classList.contains("active")).toBe(false);
      expect(elements["nav-about"].classList.contains("active")).toBe(false);
    });

    it("marks nav-data-viewer active for data-viewer tab", () => {
      showTab("data-viewer");
      expect(elements["nav-data-viewer"].classList.contains("active")).toBe(true);
      expect(elements["nav-time-entries"].classList.contains("active")).toBe(false);
      expect(elements["nav-hours-view"].classList.contains("active")).toBe(false);
      expect(elements["nav-about"].classList.contains("active")).toBe(false);
    });

    it("marks nav-hours-view active for hours-view tab", () => {
      showTab("hours-view");
      expect(elements["nav-hours-view"].classList.contains("active")).toBe(true);
      expect(elements["nav-time-entries"].classList.contains("active")).toBe(false);
      expect(elements["nav-data-viewer"].classList.contains("active")).toBe(false);
      expect(elements["nav-about"].classList.contains("active")).toBe(false);
    });

    it("marks nav-about active for about tab", () => {
      showTab("about");
      expect(elements["nav-about"].classList.contains("active")).toBe(true);
      expect(elements["nav-time-entries"].classList.contains("active")).toBe(false);
      expect(elements["nav-data-viewer"].classList.contains("active")).toBe(false);
      expect(elements["nav-hours-view"].classList.contains("active")).toBe(false);
    });
  });

  describe("view rendering", () => {
    it("calls renderDataViewer when switching to data-viewer (time-entries sub-tab)", () => {
      showTab("data-viewer");
      expect(mockRenderDataViewer).toHaveBeenCalledTimes(1);
    });

    it("calls renderHoursView when switching to hours-view", () => {
      showTab("hours-view");
      expect(mockRenderHoursView).toHaveBeenCalledTimes(1);
    });

    it("does not call renderDataViewer or renderHoursView for about tab", () => {
      showTab("about");
      expect(mockRenderDataViewer).not.toHaveBeenCalled();
      expect(mockRenderHoursView).not.toHaveBeenCalled();
    });
  });
});

describe("showSubTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetElements();
  });

  it("calls clearSelection when switching to meta-data sub-tab", () => {
    showSubTab("meta-data");
    expect(mockClearSelection).toHaveBeenCalledTimes(1);
  });

  it("does NOT call clearSelection when switching to time-entries sub-tab", () => {
    showSubTab("time-entries");
    expect(mockClearSelection).not.toHaveBeenCalled();
  });

  it("shows meta-data sub-tab and hides time-entries sub-tab", () => {
    showSubTab("meta-data");
    expect(elements["dv-meta-data-sub"].style.display).toBe("block");
    expect(elements["dv-time-entries-sub"].style.display).toBe("none");
  });

  it("shows time-entries sub-tab and hides meta-data sub-tab", () => {
    showSubTab("time-entries");
    expect(elements["dv-time-entries-sub"].style.display).toBe("block");
    expect(elements["dv-meta-data-sub"].style.display).toBe("none");
  });

  it("calls renderMetaDataForm when switching to meta-data", () => {
    showSubTab("meta-data");
    expect(mockRenderMetaDataForm).toHaveBeenCalledTimes(1);
  });

  it("calls renderDataViewer when switching to time-entries", () => {
    showSubTab("time-entries");
    expect(mockRenderDataViewer).toHaveBeenCalledTimes(1);
  });
});
