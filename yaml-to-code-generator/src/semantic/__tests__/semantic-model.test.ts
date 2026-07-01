import { describe, it, expect } from 'vitest';
import { parseYamlFile } from '../../parser/yaml-parser.js';
import { validateSpec } from '../../validator/schema-validator.js';
import { buildSemanticModel, buildSemanticModelOrThrow } from '../index.js';
import { resolveDomain } from '../resolver.js';
import { validateDomain } from '../validator.js';
import { hasErrors, formatDiagnostics, SemanticDiagnosticsError } from '../diagnostics.js';
import { toSnapshot } from '../snapshot.js';
import type { ValidatedSpec } from '../../validator/schema-validator.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const _testDir = path.dirname(fileURLToPath(import.meta.url));
const SPEC_PATH = path.resolve(_testDir, '../../..', 'specs/helpdesk.yaml');
const GOLDEN_PATH = path.resolve(_testDir, '../../..', 'test/fixtures/semantic-golden-master.json');

function loadSpec(): ValidatedSpec {
  const raw = parseYamlFile(SPEC_PATH);
  return validateSpec(raw);
}

// ── Resolution tests ──────────────────────────────────────────────────

describe('Resolver — Symbol resolution', () => {
  const spec = loadSpec();
  const { domain } = resolveDomain(spec);

  it('resolves all entities', () => {
    expect(domain.entities).toHaveLength(4);
    const names = domain.entities.map((e) => e.name).sort();
    expect(names).toEqual(['ActivityLog', 'Comment', 'Ticket', 'User']);
  });

  it('resolves all enums', () => {
    expect(domain.enums).toHaveLength(2);
    const names = domain.enums.map((e) => e.name).sort();
    expect(names).toEqual(['TicketPriority', 'TicketStatus']);
  });

  it('resolves entity attributes with correct types', () => {
    const ticket = domain.entities.find((e) => e.name === 'Ticket')!;
    expect(ticket.attributes).toHaveLength(8);

    const id = ticket.attributes.find((a) => a.name === 'id')!;
    expect(id.resolvedType.kind).toBe('primitive');
    expect(id.resolvedType.ref).toBe('String');
    expect(id.primary).toBe(true);

    const status = ticket.attributes.find((a) => a.name === 'status')!;
    expect(status.resolvedType.kind).toBe('enum');
    expect(status.resolvedType.ref).toBe('TicketStatus');

    const priority = ticket.attributes.find((a) => a.name === 'priority')!;
    expect(priority.resolvedType.ref).toBe('TicketPriority');
    expect(priority.defaultValue).toBe('MEDIUM');
  });

  it('resolves relationships with correct targets', () => {
    const ticket = domain.entities.find((e) => e.name === 'Ticket')!;
    expect(ticket.relationships).toHaveLength(3);

    const assignee = ticket.relationships.find((r) => r.name === 'assignee')!;
    expect(assignee.resolvedTarget.kind).toBe('resolved');
    expect(assignee.resolvedTarget.ref).toBe('User');
    expect(assignee.type).toBe('many_to_one');

    const comments = ticket.relationships.find((r) => r.name === 'comments')!;
    expect(comments.resolvedTarget.ref).toBe('Comment');
    expect(comments.type).toBe('one_to_many');
  });

  it('resolves use cases with categories', () => {
    const ticket = domain.entities.find((e) => e.name === 'Ticket')!;
    expect(ticket.useCases).toHaveLength(9);

    const getAll = ticket.useCases.find((u) => u.name === 'get_all')!;
    expect(getAll.category).toBe('read');
    expect(getAll.methodName).toBe('getAll');

    const create = ticket.useCases.find((u) => u.name === 'create')!;
    expect(create.category).toBe('create');

    const updateStatus = ticket.useCases.find((u) => u.name === 'update_status')!;
    expect(updateStatus.category).toBe('update');
  });

  it('computes build features', () => {
    expect(domain.buildFeatures.hasStateMachine).toBe(true);
    expect(domain.buildFeatures.hasRules).toBe(true);
    expect(domain.buildFeatures.hasValidation).toBe(true);
  });

  it('resolves app info', () => {
    expect(domain.application.name).toBe('Mini HelpDesk');
    expect(domain.application.appClassName).toBe('MiniHelpDesk');
    expect(domain.application.basePackage).toBe('com.helpdesk');
  });
});

// ── Diagnostics tests ─────────────────────────────────────────────────

describe('Resolver — Diagnostics', () => {
  const spec = loadSpec();
  const { diagnostics } = resolveDomain(spec);

  it('produces no errors for valid helpdesk spec', () => {
    expect(hasErrors(diagnostics)).toBe(false);
  });

  it('formats diagnostics correctly with no errors', () => {
    const formatted = formatDiagnostics(diagnostics);
    expect(formatted).toContain('No diagnostics');
  });

  it('SemanticDiagnosticsError has message property', () => {
    const err = new SemanticDiagnosticsError([
      { code: 'SEM-301', severity: 'error', message: 'test error' },
    ]);
    expect(err.message).toContain('test error');
    expect(err.name).toBe('SemanticDiagnosticsError');
  });
});

// ── Validator tests ───────────────────────────────────────────────────

describe('Validator — Domain validation', () => {
  const spec = loadSpec();
  const { domain } = resolveDomain(spec);

  it('validates helpdesk domain with no errors', () => {
    const diags = validateDomain(domain);
    expect(hasErrors(diags)).toBe(false);
  });

  it('detects missing primary key', () => {
    const domainWithoutPK = structuredClone(domain);
    const user = domainWithoutPK.entities.find((e) => e.name === 'User')!;
    user.primaryKey = null;
    const diags = validateDomain(domainWithoutPK);
    const pkErrors = diags.filter((d) => d.code === 'SEM-301');
    expect(pkErrors.length).toBeGreaterThan(0);
    expect(pkErrors[0].message).toContain('User');
  });
});

// ── buildSemanticModel integration tests ───────────────────────────────

describe('buildSemanticModel — Integration', () => {
  it('builds model from helpdesk spec with no errors', () => {
    const raw = parseYamlFile(SPEC_PATH);
    const spec = validateSpec(raw);
    const model = buildSemanticModel(spec);
    expect(model.domain.entities).toHaveLength(4);
    expect(model.domain.enums).toHaveLength(2);
    expect(model.meta.specName).toBe('Mini HelpDesk');
    expect(hasErrors(model.diagnostics)).toBe(false);
  });

  it('buildSemanticModelOrThrow returns valid model', () => {
    const raw = parseYamlFile(SPEC_PATH);
    const spec = validateSpec(raw);
    const model = buildSemanticModelOrThrow(spec);
    expect(model.domain.entities).toHaveLength(4);
  });

  it('buildSemanticModelOrThrow throws on invalid spec', () => {
    const raw = parseYamlFile(SPEC_PATH);
    const spec = validateSpec(raw);
    const badSpec = structuredClone(spec);
    badSpec.entities = [
      {
        name: 'Broken',
        attributes: [],
        relationships: [],
        use_cases: ['get_all'],
      } as any,
    ];
    badSpec.enums = {};
    expect(() => buildSemanticModelOrThrow(badSpec)).toThrow(SemanticDiagnosticsError);
  });

  it('formatDiagnostics formats error diagnostics', () => {
    const raw = parseYamlFile(SPEC_PATH);
    const spec = validateSpec(raw);
    const badSpec = structuredClone(spec);
    const ticket = badSpec.entities.find((e) => e.name === 'Ticket') as any;
    if (ticket && ticket.use_cases) {
      ticket.use_cases.push(ticket.use_cases[0]);
    }
    const model = buildSemanticModel(badSpec);
    const formatted = formatDiagnostics(model.diagnostics);
    expect(formatted).toBeTruthy();
  });
});

// ── Snapshot tests ────────────────────────────────────────────────────

describe('Semantic Model Snapshot', () => {
  const raw = parseYamlFile(SPEC_PATH);
  const spec = validateSpec(raw);
  const model = buildSemanticModelOrThrow(spec);
  const snapshot = toSnapshot(model);

  it('has correct meta', () => {
    expect(snapshot.meta.tool).toBe('yaml2code-semantic');
    expect(snapshot.meta.version).toBe(1);
    expect(snapshot.meta.specName).toBe('Mini HelpDesk');
    expect(snapshot.meta.timestamp).toBeTruthy();
  });

  it('has correct summary counts', () => {
    expect(snapshot.summary.entities).toBe(4);
    expect(snapshot.summary.enums).toBe(2);
    expect(snapshot.summary.attributes).toBe(27);
    expect(snapshot.summary.relationships).toBe(6);
    expect(snapshot.summary.useCases).toBeGreaterThan(0);
  });

  it('has entity snapshots with key data', () => {
    expect(snapshot.entities).toHaveLength(4);
    const ticket = snapshot.entities.find((e) => e.name === 'Ticket')!;
    expect(ticket.stereotype).toBe('aggregate_root');
    expect(ticket.attributeCount).toBe(8);
    expect(ticket.relationshipCount).toBe(3);
    expect(ticket.useCaseCount).toBe(9);
    expect(ticket.pkType).toBe('String');
    expect(ticket.attributes).toBeDefined();
    const statusAttr = ticket.attributes.find((a: any) => a.name === 'status');
    expect(statusAttr?.resolvedType?.ref).toBe('TicketStatus');
    const priorityAttr = ticket.attributes.find((a: any) => a.name === 'priority');
    expect(priorityAttr?.resolvedType?.ref).toBe('TicketPriority');
    const assigneeRel = ticket.relationships.find((r: any) => r.name === 'assignee');
    expect(assigneeRel?.resolvedTarget?.ref).toBe('User');
    const commentsRel = ticket.relationships.find((r: any) => r.name === 'comments');
    expect(commentsRel?.resolvedTarget?.ref).toBe('Comment');
  });

  it('has enum snapshots', () => {
    expect(snapshot.enums).toHaveLength(2);
    const status = snapshot.enums.find((e) => e.name === 'TicketStatus')!;
    expect(status.values).toHaveLength(4);
  });

  it('has diagnostics summary', () => {
    expect(snapshot.summary.diagnostics.error).toBe(0);
    expect(snapshot.summary.diagnostics.warning).toBe(0);
  });

  it('snapshot is JSON serializable', () => {
    const json = JSON.stringify(snapshot);
    expect(json).toBeTruthy();
    const parsed = JSON.parse(json);
    expect(parsed.summary.entities).toBe(4);
  });

  it('snapshot matches golden master', () => {
    if (!fs.existsSync(GOLDEN_PATH)) {
      fs.mkdirSync(path.dirname(GOLDEN_PATH), { recursive: true });
      fs.writeFileSync(GOLDEN_PATH, JSON.stringify(snapshot, null, 2), 'utf-8');
      return;
    }
    const golden = JSON.parse(fs.readFileSync(GOLDEN_PATH, 'utf-8'));
    expect(snapshot.summary.entities).toBe(golden.summary.entities);
    expect(snapshot.summary.enums).toBe(golden.summary.enums);
    expect(snapshot.summary.attributes).toBe(golden.summary.attributes);
    expect(snapshot.summary.flags).toEqual(golden.summary.flags);
    expect(snapshot.meta.specName).toBe(golden.meta.specName);

    for (const se of snapshot.entities) {
      const ge = golden.entities.find((e: any) => e.name === se.name);
      expect(ge).toBeDefined();
      expect(se.stereotype).toBe(ge.stereotype);
      expect(se.attributeCount).toBe(ge.attributeCount);
      expect(se.relationshipCount).toBe(ge.relationshipCount);
    }
  });
});
