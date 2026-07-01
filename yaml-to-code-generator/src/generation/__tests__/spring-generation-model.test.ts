import { describe, it, expect } from 'vitest';
import { parseYamlFile } from '../../parser/yaml-parser.js';
import { validateSpec } from '../../validator/schema-validator.js';
import { buildIR } from '../../ir/builder.js';
import { buildSemanticModelOrThrow } from '../../semantic/index.js';
import { buildSpringGenerationModel } from '../spring/builder.js';
import type { SpringGenerationModel } from '../spring/types.js';
import * as path from 'path';
import { fileURLToPath } from 'url';
const _testDir = path.dirname(fileURLToPath(import.meta.url));
const SPEC_PATH = path.resolve(_testDir, '../../..', 'specs/helpdesk.yaml');

function buildModel(): SpringGenerationModel {
  const raw = parseYamlFile(SPEC_PATH);
  const spec = validateSpec(raw);
  const semantic = buildSemanticModelOrThrow(spec);
  const ir = buildIR(semantic);
  return buildSpringGenerationModel(ir);
}

function sanitizeForSnapshot(model: SpringGenerationModel): Record<string, unknown> {
  return {
    features: model.features,
    entityNames: Object.keys(model.entities),
    enums: model.enums.map((e) => ({
      name: e.name,
      valueCount: e.values.length,
    })),
    entities: Object.fromEntries(
      Object.entries(model.entities).map(([name, gen]) => [
        name,
        {
          pkJavaType: gen.pkJavaType,
          attributeTypeNames: Object.keys(gen.attributeTypes),
          attributeTypes: Object.fromEntries(
            Object.entries(gen.attributeTypes).map(([an, at]) => [
              an,
              { javaType: at.javaType, isEnum: at.isEnum },
            ]),
          ),
          serviceMethodCount: gen.serviceMethods.length,
          serviceMethodNames: gen.serviceMethods.map((m) => m.name),
          endpointCount: gen.endpoints.length,
          repositoryMethodCount: gen.repositoryMethods.length,
          ruleCheckCount: gen.ruleChecks.length,
          hasCreatedAt: gen.hasCreatedAt,
          hasUpdatedAt: gen.hasUpdatedAt,
          oneToManyRelationCount: gen.oneToManyRelations.length,
          manyToOneRelationCount: gen.manyToOneRelations.length,
          emitsEvents: gen.emitsEvents,
          eventPublisherCount: gen.eventPublishers.length,
          transitionKeys: Object.keys(gen.transitions),
        },
      ]),
    ),
  };
}

describe('Spring Generation Model', () => {
  const model = buildModel();

  it('has all entity names', () => {
    expect(Object.keys(model.entities).sort()).toEqual(['ActivityLog', 'Comment', 'Ticket', 'User']);
  });

  it('Ticket entity has correct properties', () => {
    const ticket = model.entities['Ticket'];
    expect(ticket.pkJavaType).toBe('String');
    expect(ticket.hasCreatedAt).toBe(true);
    expect(ticket.hasUpdatedAt).toBe(true);
    expect(ticket.oneToManyRelations.length).toBe(2);
    expect(ticket.manyToOneRelations.length).toBe(1);
    expect(ticket.eventPublishers.length).toBeGreaterThanOrEqual(0);
    expect(ticket.serviceMethods.length).toBeGreaterThan(0);
    expect(ticket.endpoints.length).toBeGreaterThan(0);
    expect(Object.keys(ticket.transitions).length).toBe(4);
  });

  it('User entity has correct properties', () => {
    const user = model.entities['User'];
    expect(user.pkJavaType).toBe('String');
    expect(user.hasCreatedAt).toBe(false);
    expect(user.hasUpdatedAt).toBe(false);
    expect(user.oneToManyRelations.length).toBe(0);
    expect(user.serviceMethods.length).toBeGreaterThan(0);
  });

  it('Ticket attribute types are correct', () => {
    const at = model.entities['Ticket'].attributeTypes;
    expect(at['id'].javaType).toBe('String');
    expect(at['status'].javaType).toBe('TicketStatus');
    expect(at['status'].isEnum).toBe(true);
    expect(at['priority'].javaType).toBe('TicketPriority');
    expect(at['priority'].isEnum).toBe(true);
    expect(at['createdAt'].javaType).toBe('LocalDateTime');
    expect(at['updatedAt'].javaType).toBe('LocalDateTime');
  });

  it('Ticket service methods include key actions', () => {
    const names = model.entities['Ticket'].serviceMethods.map((m) => m.name);
    expect(names).toContain('getAll');
    expect(names).toContain('getById');
    expect(names).toContain('create');
    expect(names).toContain('updateStatus');
    expect(names).toContain('updatePriority');
    expect(names).toContain('assignUser');
    expect(names).toContain('unassignUser');
    expect(names).toContain('addComment');
  });

  it('sanitized model matches snapshot', () => {
    expect(sanitizeForSnapshot(model)).toMatchSnapshot();
  });
});
