import type { DslVersion, VersionedSpec } from './types.js';
import {
  CANONICAL_DSL_VERSION,
  extractVersion,
  versionsEqual,
  versionToString,
} from './resolver.js';
import { migrateSpec } from './migrator.js';
import { checkDeprecations } from './deprecation.js';

export function canonicalize(
  raw: Record<string, unknown>,
  targetVersion?: DslVersion,
): VersionedSpec {
  const originalVersion = extractVersion(raw);
  const canonical = targetVersion ?? CANONICAL_DSL_VERSION;

  let spec: unknown = raw;
  let migrationPath: string[] = [];
  let migrated = false;

  if (!versionsEqual(originalVersion, canonical)) {
    const result = migrateSpec(raw, originalVersion, canonical);
    spec = result.spec;
    migrationPath = result.migrationPath;
    migrated = migrationPath.length > 0;
  }

  const normalized = normalizeSpec(spec as Record<string, unknown>);

  const warnings = checkDeprecations(normalized, canonical);

  return {
    originalVersion,
    canonicalVersion: canonical,
    spec: normalized,
    warnings,
    migrationPath,
    migrated,
  };
}

export function normalizeSpec(spec: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  normalized['version'] = spec['version'] ?? versionToString(CANONICAL_DSL_VERSION);

  if (spec['application'] && typeof spec['application'] === 'object') {
    const app = spec['application'] as Record<string, unknown>;
    normalized['application'] = {
      name: app['name'] ?? 'Unnamed',
      module: app['module'] ?? 'app',
      ...(app['description'] != null ? { description: app['description'] } : {}),
      ...(app['basePackage'] != null ? { basePackage: app['basePackage'] } : {}),
    };
  }

  if (spec['enums'] && typeof spec['enums'] === 'object') {
    const enums = spec['enums'] as Record<string, unknown>;
    const normalizedEnums: Record<string, unknown> = {};
    for (const [name, def] of Object.entries(enums)) {
      if (def && typeof def === 'object') {
        const enumDef = def as Record<string, unknown>;
        normalizedEnums[name] = {
          values: Array.isArray(enumDef['values']) ? enumDef['values'] : [],
          labels:
            enumDef['labels'] && typeof enumDef['labels'] === 'object'
              ? (enumDef['labels'] as Record<string, unknown>)
              : {},
        };
      }
    }
    normalized['enums'] = normalizedEnums;
  } else {
    normalized['enums'] = {};
  }

  if (Array.isArray(spec['entities'])) {
    normalized['entities'] = (spec['entities'] as Array<Record<string, unknown>>).map(
      normalizeEntity,
    );
  } else {
    normalized['entities'] = [];
  }

  if (Array.isArray(spec['workflows'])) {
    normalized['workflows'] = spec['workflows'];
  }

  if (Array.isArray(spec['events'])) {
    normalized['events'] = spec['events'];
  }

  if (Array.isArray(spec['decisions'])) {
    normalized['decisions'] = spec['decisions'];
  }

  return normalized;
}

function normalizeEntity(entity: Record<string, unknown>): Record<string, unknown> {
  return {
    name: entity['name'] ?? 'Unknown',
    ...(entity['table'] != null ? { table: entity['table'] } : {}),
    ...(entity['description'] != null ? { description: entity['description'] } : {}),
    stereotype: entity['stereotype'] ?? 'entity',
    attributes: Array.isArray(entity['attributes'])
      ? (entity['attributes'] as Array<Record<string, unknown>>).map(normalizeAttribute)
      : [],
    relationships: Array.isArray(entity['relationships'])
      ? (entity['relationships'] as Array<Record<string, unknown>>).map(normalizeRelationship)
      : [],
    use_cases: Array.isArray(entity['use_cases']) ? entity['use_cases'] : [],
    ...(entity['transitions'] != null ? { transitions: entity['transitions'] } : {}),
    rules: Array.isArray(entity['rules']) ? entity['rules'] : [],
  };
}

function normalizeAttribute(attr: Record<string, unknown>): Record<string, unknown> {
  return {
    name: attr['name'] ?? 'unknown',
    type: attr['type'] ?? 'String',
    required: attr['required'] ?? true,
    primary: attr['primary'] ?? false,
    ...(attr['default'] != null ? { default: attr['default'] } : {}),
    ...(attr['length'] != null ? { length: attr['length'] } : {}),
    ...(attr['column'] != null ? { column: attr['column'] } : {}),
    unique: attr['unique'] ?? false,
  };
}

function normalizeRelationship(rel: Record<string, unknown>): Record<string, unknown> {
  return {
    name: rel['name'] ?? 'unknown',
    type: rel['type'] ?? 'many_to_one',
    target: rel['target'] ?? 'Unknown',
    foreign_key: rel['foreign_key'] ?? `${rel['name'] ?? 'unknown'}_id`,
    ...(rel['source_cardinality'] != null ? { source_cardinality: rel['source_cardinality'] } : {}),
    ...(rel['target_cardinality'] != null ? { target_cardinality: rel['target_cardinality'] } : {}),
  };
}
