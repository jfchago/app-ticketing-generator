import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerFeature,
  checkDeprecations,
  listDeprecatedFeatures,
  clearFeatureRegistry,
} from '../deprecation.js';
import type { DslVersion } from '../types.js';

const V1: DslVersion = { major: 1, minor: 0, patch: 0 };
const V2: DslVersion = { major: 2, minor: 0, patch: 0 };
const V3: DslVersion = { major: 3, minor: 0, patch: 0 };

describe('checkDeprecations', () => {
  beforeEach(() => {
    clearFeatureRegistry();
  });

  it('returns empty for spec without deprecated features', () => {
    const spec = {
      application: { name: 'Test', module: 'test' },
      entities: [],
    };
    expect(checkDeprecations(spec, V1)).toEqual([]);
  });

  it('emits warning when deprecated feature is in use', () => {
    registerFeature({
      feature: 'legacy_field',
      introduced: V1,
      deprecated: V2,
      removed: null,
      code: 'FEAT-001',
      message: 'Use new_field instead',
      replacement: 'Use new_field instead',
    });

    const spec = {
      application: { name: 'Test' },
      legacy_field: true,
      entities: [],
    };
    const warnings = checkDeprecations(spec, V2);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].severity).toBe('warning');
    expect(warnings[0].code).toBe('DEPR-FEAT-001:WARN');
  });

  it('emits error when removed feature is in use', () => {
    registerFeature({
      feature: 'old_api',
      introduced: V1,
      deprecated: V2,
      removed: V3,
      code: 'FEAT-002',
      message: 'old_api removed',
      replacement: 'Use new_api instead',
    });

    const spec = {
      application: { name: 'Test' },
      old_api: 'value',
      entities: [],
    };
    const warnings = checkDeprecations(spec, V3);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].severity).toBe('error');
    expect(warnings[0].code).toBe('DEPR-FEAT-002:REMOVED');
  });

  it('does not emit warning when using version before deprecation', () => {
    registerFeature({
      feature: 'future_deprecated',
      introduced: V1,
      deprecated: V2,
      removed: null,
      code: 'FEAT-003',
      message: 'Will be deprecated',
      replacement: 'Use replacement',
    });

    const spec = {
      application: { name: 'Test' },
      future_deprecated: true,
      entities: [],
    };
    const warnings = checkDeprecations(spec, V1);
    expect(warnings).toEqual([]);
  });

  it('does not emit warning when feature is not in use', () => {
    registerFeature({
      feature: 'unused_feature',
      introduced: V1,
      deprecated: V2,
      removed: null,
      code: 'FEAT-004',
      message: 'Should not appear',
      replacement: '',
    });

    const spec = { application: { name: 'Test' }, entities: [] };
    const warnings = checkDeprecations(spec, V2);
    expect(warnings).toEqual([]);
  });
});

describe('listDeprecatedFeatures', () => {
  beforeEach(() => {
    clearFeatureRegistry();
  });

  it('lists features deprecated at current version', () => {
    registerFeature({
      feature: 'deprecated_now',
      introduced: V1,
      deprecated: V2,
      removed: null,
      code: 'FEAT-005',
      message: '',
      replacement: '',
    });
    registerFeature({
      feature: 'still_stable',
      introduced: V1,
      deprecated: null,
      removed: null,
      code: 'FEAT-006',
      message: '',
      replacement: '',
    });

    const deprecated = listDeprecatedFeatures(V2);
    expect(deprecated).toHaveLength(1);
    expect(deprecated[0].feature).toBe('deprecated_now');
  });

  it('excludes removed features from deprecated list', () => {
    registerFeature({
      feature: 'already_removed',
      introduced: V1,
      deprecated: V2,
      removed: V3,
      code: 'FEAT-007',
      message: '',
      replacement: '',
    });

    expect(listDeprecatedFeatures(V3)).toEqual([]);
  });
});
