import { describe, it, expect } from 'vitest';
import { inspectStage } from '../../generator/orchestrator.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const _testDir = path.dirname(fileURLToPath(import.meta.url));
const SPEC_PATH = path.resolve(_testDir, '../../..', 'specs/helpdesk.yaml');

describe('inspect command stages', () => {
  it('raw stage returns parsed YAML with application name', () => {
    const result = inspectStage(SPEC_PATH, 'raw') as Record<string, unknown>;
    const app = result['application'] as Record<string, unknown>;
    expect(app['name']).toBe('Mini HelpDesk');
    expect((result['entities'] as unknown[]).length).toBe(3);
  });

  it('validated stage returns validated spec with normalized fields', () => {
    const result = inspectStage(SPEC_PATH, 'validated') as Record<string, unknown>;
    const app = result['application'] as Record<string, unknown>;
    expect(app['name']).toBe('Mini HelpDesk');
    const entities = result['entities'] as unknown[];
    expect(entities.length).toBe(3);
  });

  it('semantic stage returns SemanticSnapshot with entity summary', () => {
    const result = inspectStage(SPEC_PATH, 'semantic') as Record<string, unknown>;
    const summary = result['summary'] as Record<string, unknown>;
    expect(summary['entities']).toBe(3);
    expect(summary['enums']).toBe(2);
    expect(summary['diagnostics']).toBeDefined();
    const entities = result['entities'] as unknown[];
    expect(entities.length).toBe(3);
  });

  it('ir stage returns IRSnapshot with entity summary', () => {
    const result = inspectStage(SPEC_PATH, 'ir') as Record<string, unknown>;
    const summary = result['summary'] as Record<string, unknown>;
    expect(summary['entities']).toBe(3);
    expect(summary['enums']).toBe(2);
    const entities = result['entities'] as unknown[];
    expect(entities.length).toBe(3);
  });

  it('vue-model stage returns sanitized generation model', () => {
    const result = inspectStage(SPEC_PATH, 'vue-model') as Record<string, unknown>;
    const entityNames = result['entityNames'] as string[];
    expect(entityNames.sort()).toEqual(['Comment', 'Ticket', 'User']);
    const entities = result['entities'] as Record<string, unknown>;
    expect(Object.keys(entities).length).toBe(3);
  });

  it('spring-model stage returns sanitized generation model', () => {
    const result = inspectStage(SPEC_PATH, 'spring-model') as Record<string, unknown>;
    const entityNames = result['entityNames'] as string[];
    expect(entityNames.sort()).toEqual(['Comment', 'Ticket', 'User']);
    const entities = result['entities'] as Record<string, unknown>;
    expect(Object.keys(entities).length).toBe(3);
  });

  it('throws on unknown stage', () => {
    expect(() => inspectStage(SPEC_PATH, 'unknown' as any)).toThrow();
  });
});
