export type {
  DslVersion,
  VersionInfo,
  VersionedSpec,
  MigrationStep,
  DeprecationNotice,
} from "./types.js";

export {
  CANONICAL_DSL_VERSION,
  DEFAULT_DSL_VERSION,
  parseDslVersion,
  versionToString,
  compareVersions,
  isVersionOlder,
  extractVersion,
  extractVersionString,
  versionsEqual,
} from "./resolver.js";

export { canonicalize, normalizeSpec } from "./canonicalize.js";

export {
  registerMigration,
  migrateSpec,
  isMigrationIdempotent,
  listRegisteredMigrations,
  clearRegistry,
} from "./migrator.js";

export {
  registerFeature,
  checkDeprecations,
  listDeprecatedFeatures,
  clearFeatureRegistry,
} from "./deprecation.js";
