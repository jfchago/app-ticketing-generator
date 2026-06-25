import type { DslVersion, DeprecationNotice } from "./types.js";
import { compareVersions, isVersionOlder } from "./resolver.js";

interface FeatureRecord {
  feature: string;
  introduced: DslVersion;
  deprecated: DslVersion | null;
  removed: DslVersion | null;
  code: string;
  message: string;
  replacement: string;
}

const FEATURE_REGISTRY: FeatureRecord[] = [];

export function registerFeature(record: FeatureRecord): void {
  FEATURE_REGISTRY.push(record);
}

export function checkDeprecations(
  spec: Record<string, unknown>,
  canonicalVersion: DslVersion,
): DeprecationNotice[] {
  const notices: DeprecationNotice[] = [];

  for (const feature of FEATURE_REGISTRY) {
    if (feature.removed && !isVersionOlder(canonicalVersion, feature.removed)) {
      notices.push({
        code: `DEPR-${feature.code}:REMOVED`,
        feature: feature.feature,
        message: `${feature.feature} was removed in ${formatVersion(feature.removed)}. ${feature.replacement}`,
        since: feature.deprecated ?? feature.removed,
        removal: feature.removed,
        severity: "error",
      });
    } else if (
      feature.deprecated &&
      !isVersionOlder(canonicalVersion, feature.deprecated)
    ) {
      const found = detectFeatureUsage(spec, feature.feature);
      if (found) {
        notices.push({
          code: `DEPR-${feature.code}:WARN`,
          feature: feature.feature,
          message: `${feature.feature} is deprecated since ${formatVersion(feature.deprecated)}. ${feature.replacement}`,
          since: feature.deprecated,
          removal: feature.removed ?? { major: feature.deprecated.major + 1, minor: 0, patch: 0 },
          severity: "warning",
        });
      }
    }
  }

  return notices;
}

function detectFeatureUsage(spec: Record<string, unknown>, feature: string): boolean {
  const featureLower = feature.toLowerCase();
  if (typeof spec !== 'object' || spec === null) return false;

  const entities = spec['entities'];
  if (Array.isArray(entities)) {
    for (const entity of entities) {
      if (typeof entity !== 'object' || entity === null) continue;
      const e = entity as Record<string, unknown>;
      if (Object.keys(e).some(k => k.toLowerCase() === featureLower)) return true;
      const attrs = e['attributes'];
      if (Array.isArray(attrs)) {
        for (const attr of attrs) {
          if (typeof attr === 'object' && attr !== null && Object.keys(attr as Record<string, unknown>).some(k => k.toLowerCase() === featureLower)) return true;
        }
      }
      const rels = e['relationships'];
      if (Array.isArray(rels)) {
        for (const rel of rels) {
          if (typeof rel === 'object' && rel !== null && Object.keys(rel as Record<string, unknown>).some(k => k.toLowerCase() === featureLower)) return true;
        }
      }
      const ucs = e['use_cases'];
      if (Array.isArray(ucs)) {
        if (ucs.some(uc => String(uc).toLowerCase() === featureLower)) return true;
      }
    }
  }
  return Object.keys(spec).some(k => k.toLowerCase() === featureLower);
}

function formatVersion(v: DslVersion): string {
  return `v${v.major}.${v.minor}.${v.patch}`;
}

export function listDeprecatedFeatures(canonicalVersion: DslVersion): FeatureRecord[] {
  return FEATURE_REGISTRY.filter(
    (f) =>
      f.deprecated !== null &&
      !isVersionOlder(canonicalVersion, f.deprecated) &&
      (f.removed === null || isVersionOlder(canonicalVersion, f.removed)),
  );
}

export function clearFeatureRegistry(): void {
  FEATURE_REGISTRY.length = 0;
}
