import { describe, it, expect } from 'vitest';
import { parseYamlFile } from '../../parser/yaml-parser.js';
import { validateSpec } from '../../validator/schema-validator.js';
import { buildIR } from '../../ir/builder.js';
import { buildSemanticModelOrThrow } from '../../semantic/index.js';
import { buildVueGenerationModel } from '../vue/builder.js';
import type { VueGenerationModel } from '../vue/types.js';
import * as path from 'path';
import { fileURLToPath } from 'url';
const _testDir = path.dirname(fileURLToPath(import.meta.url));
const SPEC_PATH = path.resolve(_testDir, '../../..', 'specs/helpdesk.yaml');

function buildModel(): VueGenerationModel {
  const raw = parseYamlFile(SPEC_PATH);
  const spec = validateSpec(raw);
  const semantic = buildSemanticModelOrThrow(spec);
  const ir = buildIR(semantic);
  return buildVueGenerationModel(ir);
}

function sanitizeForSnapshot(model: VueGenerationModel): Record<string, unknown> {
  return {
    features: model.features,
    entityNames: Object.keys(model.entities),
    enums: model.enums.map(e => ({ name: e.name, valueCount: e.values.length })),
    entities: Object.fromEntries(
      Object.entries(model.entities).map(([name, gen]) => [
        name,
        {
          statePropertyName: gen.statePropertyName,
          selectedPropertyName: gen.selectedPropertyName,
          displayFieldCount: gen.displayFields.length,
          formFieldCount: gen.formFields.length,
          componentFlags: gen.components,
          useCaseNames: Object.keys(gen.useCases),
          useCaseCategories: Object.fromEntries(
            Object.entries(gen.useCases).map(([name, uc]) => [name, uc.actionCategory])
          ),
          storeActionCount: gen.storeActions.length,
          ruleCheckCount: gen.ruleChecks.length,
          hasCommentSupport: gen.hasCommentSupport,
          hasAssignee: gen.hasAssignee,
          enumAttributeCount: gen.enumAttributes.length,
          transitionKeys: Object.keys(gen.transitions),
        },
      ])
    ),
  };
}

describe('Vue Generation Model', () => {
  const model = buildModel();

  it('has all entity names', () => {
    expect(Object.keys(model.entities).sort()).toEqual(['Comment', 'Ticket', 'User']);
  });

  it('has all enums', () => {
    expect(model.enums.map(e => e.name).sort()).toEqual(['TicketPriority', 'TicketStatus']);
  });

  it('Ticket entity has correct properties', () => {
    const ticket = model.entities['Ticket'];
    expect(ticket.statePropertyName).toBe('tickets');
    expect(ticket.selectedPropertyName).toBe('current');
    expect(ticket.hasCommentSupport).toBe(true);
    expect(ticket.hasAssignee).toBe(true);
    expect(ticket.components.shouldRenderStatusBadge).toBe(true);
    expect(ticket.components.shouldRenderPriorityBadge).toBe(true);
    expect(ticket.components.shouldRenderAssigneeBadge).toBe(true);
    expect(ticket.components.shouldRenderCard).toBe(true);
    expect(ticket.components.shouldRenderForm).toBe(true);
    expect(Object.keys(ticket.transitions).length).toBe(4);
    expect(ticket.ruleChecks.length).toBeGreaterThan(0);
    expect(ticket.storeActions.length).toBeGreaterThan(0);
  });

  it('User entity has correct properties', () => {
    const user = model.entities['User'];
    expect(user.hasCommentSupport).toBe(false);
    expect(user.hasAssignee).toBe(false);
    expect(user.components.shouldRenderCard).toBe(true);
    expect(user.components.shouldRenderForm).toBe(false);
    expect(user.components.shouldRenderStatusBadge).toBe(false);
    expect(user.components.shouldRenderPriorityBadge).toBe(false);
    expect(user.components.shouldRenderAssigneeBadge).toBe(false);
  });

  it('Comment entity has correct properties', () => {
    const comment = model.entities['Comment'];
    expect(comment.hasCommentSupport).toBe(false);
    expect(comment.components.shouldRenderCard).toBe(false);
    expect(comment.components.shouldRenderForm).toBe(false);
  });

  it('Ticket use cases have correct categories', () => {
    const sanitized = sanitizeForSnapshot(model);
    const ticketData = sanitized.entities as Record<string, any>;
    const categories = ticketData['Ticket'].useCaseCategories;
    expect(categories).toEqual({
      add_comment: "comment",
      assign_user: "assign",
      create: "create",
      get_all: "read",
      get_by_id: "readById",
      unassign_user: "unassign",
      update_priority: "updatePriority",
      update_status: "updateStatus",
    });
  });

  it('sanitized model matches snapshot', () => {
    expect(sanitizeForSnapshot(model)).toMatchSnapshot();
  });
});
