import { describe, it, expect } from "vitest";
import {
  parseDslVersion,
  versionToString,
  compareVersions,
  isVersionOlder,
  extractVersion,
  versionsEqual,
  CANONICAL_DSL_VERSION,
  DEFAULT_DSL_VERSION,
} from "../resolver.js";

describe("parseDslVersion", () => {
  it("parses valid semver strings", () => {
    expect(parseDslVersion("1.0.0")).toEqual({ major: 1, minor: 0, patch: 0 });
    expect(parseDslVersion("2.3.4")).toEqual({ major: 2, minor: 3, patch: 4 });
  });

  it("parses version strings with v prefix", () => {
    expect(parseDslVersion("v1.0.0")).toEqual({ major: 1, minor: 0, patch: 0 });
  });

  it("trims whitespace", () => {
    expect(parseDslVersion("  1.2.3  ")).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
    });
  });

  it("returns null for invalid strings", () => {
    expect(parseDslVersion("")).toBeNull();
    expect(parseDslVersion("1.0")).toBeNull();
    expect(parseDslVersion("v1")).toBeNull();
    expect(parseDslVersion("abc")).toBeNull();
    expect(parseDslVersion("1.0.0.0")).toBeNull();
  });
});

describe("versionToString", () => {
  it("converts version to string", () => {
    expect(versionToString({ major: 1, minor: 0, patch: 0 })).toBe("1.0.0");
    expect(versionToString({ major: 2, minor: 3, patch: 4 })).toBe("2.3.4");
  });
});

describe("compareVersions", () => {
  it("returns 0 for equal versions", () => {
    expect(
      compareVersions(
        { major: 1, minor: 0, patch: 0 },
        { major: 1, minor: 0, patch: 0 },
      ),
    ).toBe(0);
  });

  it("returns negative when a < b", () => {
    expect(
      compareVersions(
        { major: 1, minor: 0, patch: 0 },
        { major: 2, minor: 0, patch: 0 },
      ),
    ).toBeLessThan(0);
    expect(
      compareVersions(
        { major: 1, minor: 0, patch: 0 },
        { major: 1, minor: 1, patch: 0 },
      ),
    ).toBeLessThan(0);
    expect(
      compareVersions(
        { major: 1, minor: 1, patch: 0 },
        { major: 1, minor: 1, patch: 1 },
      ),
    ).toBeLessThan(0);
  });

  it("returns positive when a > b", () => {
    expect(
      compareVersions(
        { major: 2, minor: 0, patch: 0 },
        { major: 1, minor: 0, patch: 0 },
      ),
    ).toBeGreaterThan(0);
  });
});

describe("isVersionOlder", () => {
  it("detects older versions", () => {
    expect(
      isVersionOlder(
        { major: 1, minor: 0, patch: 0 },
        { major: 2, minor: 0, patch: 0 },
      ),
    ).toBe(true);
  });

  it("returns false for same or newer versions", () => {
    expect(
      isVersionOlder(
        { major: 2, minor: 0, patch: 0 },
        { major: 1, minor: 0, patch: 0 },
      ),
    ).toBe(false);
    expect(
      isVersionOlder(
        { major: 1, minor: 0, patch: 0 },
        { major: 1, minor: 0, patch: 0 },
      ),
    ).toBe(false);
  });
});

describe("versionsEqual", () => {
  it("returns true for equal versions", () => {
    expect(
      versionsEqual(
        { major: 1, minor: 0, patch: 0 },
        { major: 1, minor: 0, patch: 0 },
      ),
    ).toBe(true);
  });

  it("returns false for different versions", () => {
    expect(
      versionsEqual(
        { major: 1, minor: 0, patch: 0 },
        { major: 1, minor: 0, patch: 1 },
      ),
    ).toBe(false);
  });
});

describe("extractVersion", () => {
  it("reads version string field", () => {
    expect(extractVersion({ version: "2.0.0" })).toEqual({
      major: 2,
      minor: 0,
      patch: 0,
    });
  });

  it("reads numeric version field", () => {
    expect(extractVersion({ version: 3 })).toEqual({
      major: 3,
      minor: 0,
      patch: 0,
    });
  });

  it("returns default for missing version", () => {
    expect(extractVersion({})).toEqual(DEFAULT_DSL_VERSION);
  });

  it("returns default for invalid version string", () => {
    expect(extractVersion({ version: "not-a-version" })).toEqual(
      DEFAULT_DSL_VERSION,
    );
  });

  it("returns default for null version", () => {
    expect(extractVersion({ version: null })).toEqual(DEFAULT_DSL_VERSION);
  });
});

describe("constants", () => {
  it("CANONICAL_DSL_VERSION is defined", () => {
    expect(CANONICAL_DSL_VERSION).toEqual({ major: 1, minor: 0, patch: 0 });
  });

  it("DEFAULT_DSL_VERSION equals CANONICAL_DSL_VERSION initially", () => {
    expect(DEFAULT_DSL_VERSION).toEqual(CANONICAL_DSL_VERSION);
  });
});
