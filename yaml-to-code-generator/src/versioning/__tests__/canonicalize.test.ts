import { describe, it, expect } from 'vitest';
import { canonicalize, normalizeSpec } from '../canonicalize.js';
import { CANONICAL_DSL_VERSION, versionToString } from '../resolver.js';

describe('normalizeSpec', () => {
  it('adds version if missing', () => {
    const raw: Record<string, unknown> = {
      application: { name: 'Test', module: 'test' },
      entities: [],
      enums: {},
    };
    const normalized = normalizeSpec(raw);
    expect(normalized['version']).toBe(versionToString(CANONICAL_DSL_VERSION));
  });

  it('preserves explicit version', () => {
    const raw: Record<string, unknown> = {
      version: '2.0.0',
      application: { name: 'Test', module: 'test' },
      entities: [],
      enums: {},
    };
    const normalized = normalizeSpec(raw);
    expect(normalized['version']).toBe('2.0.0');
  });

  it('fills default application fields', () => {
    const raw: Record<string, unknown> = {
      application: {},
      entities: [],
      enums: {},
    };
    const normalized = normalizeSpec(raw);
    const app = normalized['application'] as Record<string, unknown>;
    expect(app['name']).toBe('Unnamed');
    expect(app['module']).toBe('app');
  });

  it('fills default entity stereotype', () => {
    const raw: Record<string, unknown> = {
      application: { name: 'Test', module: 'test' },
      entities: [
        {
          name: 'Foo',
          attributes: [{ name: 'id', type: 'String' }],
        },
      ],
      enums: {},
    };
    const normalized = normalizeSpec(raw);
    const entities = normalized['entities'] as Array<Record<string, unknown>>;
    expect(entities[0]['stereotype']).toBe('entity');
  });

  it('fills default attribute fields', () => {
    const raw: Record<string, unknown> = {
      application: { name: 'Test', module: 'test' },
      entities: [
        {
          name: 'Foo',
          attributes: [{ name: 'id' }],
        },
      ],
      enums: {},
    };
    const normalized = normalizeSpec(raw);
    const entities = normalized['entities'] as Array<Record<string, unknown>>;
    const attrs = entities[0]['attributes'] as Array<Record<string, unknown>>;
    expect(attrs[0]['type']).toBe('String');
    expect(attrs[0]['required']).toBe(true);
    expect(attrs[0]['primary']).toBe(false);
    expect(attrs[0]['unique']).toBe(false);
  });

  it('fills default relationship fields', () => {
    const raw: Record<string, unknown> = {
      application: { name: 'Test', module: 'test' },
      entities: [
        {
          name: 'Foo',
          attributes: [{ name: 'id', type: 'String' }],
          relationships: [{ name: 'bar', target: 'Bar' }],
        },
      ],
      enums: {},
    };
    const normalized = normalizeSpec(raw);
    const entities = normalized['entities'] as Array<Record<string, unknown>>;
    const rels = entities[0]['relationships'] as Array<Record<string, unknown>>;
    expect(rels[0]['type']).toBe('many_to_one');
    expect(rels[0]['foreign_key']).toBe('bar_id');
  });

  it('preserves existing enum labels', () => {
    const raw: Record<string, unknown> = {
      application: { name: 'Test', module: 'test' },
      entities: [{ name: 'Foo', attributes: [{ name: 'id', type: 'String' }] }],
      enums: {
        Status: { values: ['A', 'B'], labels: { A: 'Alpha' } },
      },
    };
    const normalized = normalizeSpec(raw);
    const enums = normalized['enums'] as Record<string, unknown>;
    const status = enums['Status'] as Record<string, unknown>;
    expect(status['values']).toEqual(['A', 'B']);
    expect((status['labels'] as Record<string, unknown>)['A']).toBe('Alpha');
  });

  it('normalizes unknown keys away', () => {
    const raw: Record<string, unknown> = {
      application: { name: 'Test', module: 'test', unknownField: true },
      entities: [
        {
          name: 'Foo',
          attributes: [{ name: 'id', type: 'String', extra: 'boom' }],
        },
      ],
      enums: {},
      randomKey: 'should-be-ignored',
    };
    const normalized = normalizeSpec(raw);
    expect(normalized['randomKey']).toBeUndefined();
    expect(normalized['application']).toBeDefined();
    const app = normalized['application'] as Record<string, unknown>;
    expect(app['unknownField']).toBeUndefined();
  });
});

describe('canonicalize', () => {
  it('sets original and canonical versions', () => {
    const raw: Record<string, unknown> = {
      version: '1.0.0',
      application: { name: 'Test', module: 'test' },
      entities: [{ name: 'Foo', attributes: [{ name: 'id', type: 'String' }] }],
      enums: {},
    };
    const result = canonicalize(raw);
    expect(result.originalVersion).toEqual({ major: 1, minor: 0, patch: 0 });
    expect(result.canonicalVersion).toEqual(CANONICAL_DSL_VERSION);
    expect(result.migrated).toBe(false);
  });

  it('detects missing version and sets default', () => {
    const raw: Record<string, unknown> = {
      application: { name: 'Test', module: 'test' },
      entities: [{ name: 'Foo', attributes: [{ name: 'id', type: 'String' }] }],
      enums: {},
    };
    const result = canonicalize(raw);
    expect(result.originalVersion).toEqual({ major: 1, minor: 0, patch: 0 });
    expect(result.migrated).toBe(false);
  });

  it('normalizes spec', () => {
    const raw: Record<string, unknown> = {
      application: { name: 'Test', module: 'test' },
      entities: [],
      enums: {},
    };
    const result = canonicalize(raw);
    const spec = result.spec as Record<string, unknown>;
    expect(spec['version']).toBeDefined();
  });

  it('returns empty warnings for valid spec', () => {
    const raw: Record<string, unknown> = {
      application: { name: 'Test', module: 'test' },
      entities: [{ name: 'Foo', attributes: [{ name: 'id', type: 'String' }] }],
      enums: {},
    };
    const result = canonicalize(raw);
    expect(result.warnings).toEqual([]);
  });
});

describe('canonicalize snapshots', () => {
  const fullSpec: Record<string, unknown> = {
    version: '1.0.0',
    application: { name: 'Snapshot App', module: 'snap' },
    entities: [
      {
        name: 'Item',
        attributes: [
          { name: 'id', type: 'String', primary: true },
          { name: 'name', type: 'String' },
        ],
        relationships: [
          {
            name: 'category',
            target: 'Category',
            type: 'many_to_one',
            foreign_key: 'category_id',
          },
        ],
      },
      {
        name: 'Category',
        attributes: [{ name: 'id', type: 'String', primary: true }],
      },
    ],
    enums: {
      ItemStatus: {
        values: ['ACTIVE', 'ARCHIVED'],
        labels: { ACTIVE: 'Active' },
      },
    },
  };

  it('snapshot: full canonicalized spec structure', () => {
    const result = canonicalize(fullSpec);
    expect(result.spec).toMatchSnapshot();
  });

  it('snapshot: version info for full spec', () => {
    const result = canonicalize(fullSpec);
    expect({
      version: {
        original: result.originalVersion,
        canonical: result.canonicalVersion,
        migrated: result.migrated,
        migrationPath: result.migrationPath,
      },
      warnings: result.warnings,
    }).toMatchSnapshot();
  });
});
