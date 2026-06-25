export interface DslVersion {
  major: number;
  minor: number;
  patch: number;
}

export interface VersionInfo {
  original: DslVersion;
  canonical: DslVersion;
  migrated: boolean;
  migrationPath: string[];
}

export interface MigrationStep {
  from: DslVersion;
  to: DslVersion;
  label: string;
  applicable: (spec: unknown) => boolean;
  apply: (spec: unknown) => unknown;
}

export interface DeprecationNotice {
  code: string;
  feature: string;
  message: string;
  since: DslVersion;
  removal: DslVersion;
  severity: "warning" | "error";
}

export interface VersionedSpec {
  originalVersion: DslVersion;
  canonicalVersion: DslVersion;
  spec: unknown;
  warnings: DeprecationNotice[];
  migrated: boolean;
  migrationPath: string[];
}
