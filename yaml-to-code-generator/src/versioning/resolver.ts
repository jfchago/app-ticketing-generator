import type { DslVersion } from "./types.js";

const VERSION_REGEX = /^v?(\d+)\.(\d+)\.(\d+)$/;

export const CANONICAL_DSL_VERSION: DslVersion = {
  major: 1,
  minor: 0,
  patch: 0,
};

export const DEFAULT_DSL_VERSION: DslVersion = { major: 1, minor: 0, patch: 0 };

export function parseDslVersion(raw: string): DslVersion | null {
  const m = VERSION_REGEX.exec(raw.trim());
  if (!m) return null;
  return {
    major: parseInt(m[1], 10),
    minor: parseInt(m[2], 10),
    patch: parseInt(m[3], 10),
  };
}

export function versionToString(v: DslVersion): string {
  return `${v.major}.${v.minor}.${v.patch}`;
}

export function compareVersions(a: DslVersion, b: DslVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

export function isVersionOlder(
  version: DslVersion,
  reference: DslVersion,
): boolean {
  return compareVersions(version, reference) < 0;
}

export function extractVersion(raw: Record<string, unknown>): DslVersion {
  const versionField = raw["version"];
  if (typeof versionField === "string") {
    const parsed = parseDslVersion(versionField);
    if (parsed) return parsed;
  }
  if (typeof versionField === "number") {
    return { major: versionField, minor: 0, patch: 0 };
  }
  return { ...DEFAULT_DSL_VERSION };
}

export function extractVersionString(raw: Record<string, unknown>): string {
  const v = extractVersion(raw);
  return versionToString(v);
}

export function versionsEqual(a: DslVersion, b: DslVersion): boolean {
  return a.major === b.major && a.minor === b.minor && a.patch === b.patch;
}
