// semantic/validator.ts — Centralized semantic validation
// Checks entity invariants, uniqueness constraints, and behavior AST consistency.
// All validation produces SemanticDiagnostic entries (never throws).

import type { ResolvedDomain, ResolvedEntity, ResolvedWorkflow, ResolvedEvent, ResolvedDecision } from './types.js';
import type { BehaviorAST } from '../lang/ast-types.js';
import type { SemanticDiagnostic } from './diagnostics.js';
import { error } from './diagnostics.js';

export function validateDomain(domain: ResolvedDomain): SemanticDiagnostic[] {
  const diagnostics: SemanticDiagnostic[] = [];

  for (const entity of domain.entities) {
    diagnostics.push(...validateEntity(entity, domain.entities));
  }

  for (const wf of domain.workflows) {
    diagnostics.push(...validateWorkflow(wf));
  }

  for (const ev of domain.events) {
    diagnostics.push(...validateEvent(ev));
  }

  for (const dc of domain.decisions) {
    diagnostics.push(...validateDecision(dc));
  }

  diagnostics.push(...validateUniqueness(domain));

  return diagnostics;
}

function validateEntity(entity: ResolvedEntity, _allEntities: ResolvedEntity[]): SemanticDiagnostic[] {
  const d: SemanticDiagnostic[] = [];

  if (!entity.primaryKey) {
    d.push(error('SEM-301', `Entity "${entity.name}": no primary key defined. Mark one attribute with primary: true.`,
      { kind: 'entity', name: entity.name }));
  }

  const pkCount = entity.attributes.filter(a => a.primary).length;
  if (pkCount > 1) {
    d.push(error('SEM-302', `Entity "${entity.name}": ${pkCount} primary keys defined (only 1 allowed).`,
      { kind: 'entity', name: entity.name }));
  }

  if (entity.useCases.length === 0) {
    // info-level — not an error, but worthy of note
  }

  return d;
}

function validateWorkflow(wf: ResolvedWorkflow): SemanticDiagnostic[] {
  const d: SemanticDiagnostic[] = [];
  const stepIds = new Set(wf.steps.map(s => s.id));

  if (wf.startStep && !stepIds.has(wf.startStep)) {
    d.push(error('SEM-104', `Workflow "${wf.name}": start step "${wf.startStep}" not found in steps.`,
      { kind: 'workflow', name: wf.name },
      { kind: 'step', name: wf.startStep, parent: wf.name },
    ));
  }

  for (const es of wf.endSteps) {
    if (!stepIds.has(es)) {
      d.push(error('SEM-105', `Workflow "${wf.name}": end step "${es}" not found in steps.`,
        { kind: 'workflow', name: wf.name },
        { kind: 'step', name: es, parent: wf.name },
      ));
    }
  }

  return d;
}

function validateEvent(_ev: ResolvedEvent): SemanticDiagnostic[] {
  return [];
}

function validateDecision(_dc: ResolvedDecision): SemanticDiagnostic[] {
  return [];
}

function validateUniqueness(domain: ResolvedDomain): SemanticDiagnostic[] {
  const d: SemanticDiagnostic[] = [];
  const tableNames = new Map<string, string>();

  for (const entity of domain.entities) {
    // Duplicate table names
    const existing = tableNames.get(entity.table);
    if (existing) {
      d.push(error('SEM-201', `Duplicate table name "${entity.table}" (entities "${existing}" and "${entity.name}").`,
        { kind: 'entity', name: entity.name },
        { kind: 'entity', name: existing },
      ));
    } else {
      tableNames.set(entity.table, entity.name);
    }

    // Duplicate attribute names
    const attrNames = new Set<string>();
    for (const attr of entity.attributes) {
      if (attrNames.has(attr.name)) {
        d.push(error('SEM-202', `Duplicate attribute name "${attr.name}" in entity "${entity.name}".`,
          { kind: 'attribute', name: attr.name, parent: entity.name }));
      }
      attrNames.add(attr.name);
    }

    // Duplicate relationship names
    const relNames = new Set<string>();
    for (const rel of entity.relationships) {
      if (relNames.has(rel.name)) {
        d.push(error('SEM-203', `Duplicate relationship name "${rel.name}" in entity "${entity.name}".`,
          { kind: 'relationship', name: rel.name, parent: entity.name }));
      }
      relNames.add(rel.name);
    }

    // Duplicate use cases
    const ucNames = new Set<string>();
    for (const uc of entity.useCases) {
      if (ucNames.has(uc.name)) {
        d.push(error('SEM-204', `Duplicate use case "${uc.name}" in entity "${entity.name}".`,
          { kind: 'use_case', name: uc.name, parent: entity.name }));
      }
      ucNames.add(uc.name);
    }
  }

  // Workflow uniqueness checks
  for (const wf of domain.workflows) {
    const stepNames = new Set<string>();
    for (const step of wf.steps) {
      if (stepNames.has(step.id)) {
        d.push(error('SEM-205', `Duplicate workflow step "${step.id}" in workflow "${wf.name}".`,
          { kind: 'step', name: step.id, parent: wf.name }));
      }
      stepNames.add(step.id);
    }

    const participantNames = new Set<string>();
    for (const p of wf.participants) {
      if (participantNames.has(p.name)) {
        d.push(error('SEM-206', `Duplicate participant "${p.name}" in workflow "${wf.name}".`,
          { kind: 'participant', name: p.name, parent: wf.name }));
      }
      participantNames.add(p.name);
    }
  }

  // Event uniqueness checks
  for (const ev of domain.events) {
    const handlerSet = new Set<string>();
    for (const h of ev.handlers) {
      if (handlerSet.has(h)) {
        d.push(error('SEM-207', `Duplicate event handler "${h}" in event "${ev.name}".`,
          { kind: 'handler', name: h, parent: ev.name }));
      }
      handlerSet.add(h);
    }

    const fieldSet = new Set<string>();
    for (const f of ev.payload) {
      if (fieldSet.has(f.name)) {
        d.push(error('SEM-208', `Duplicate payload field "${f.name}" in event "${ev.name}".`,
          { kind: 'payload_field', name: f.name, parent: ev.name }));
      }
      fieldSet.add(f.name);
    }
  }

  // Decision uniqueness checks
  for (const dc of domain.decisions) {
    const condSet = new Set<string>();
    for (const c of dc.cases) {
      if (condSet.has(c.condition)) {
        d.push(error('SEM-209', `Duplicate when condition "${c.condition}" in decision "${dc.name}".`,
          { kind: 'condition', name: c.condition, parent: dc.name }));
      }
      condSet.add(c.condition);
    }
  }

  return d;
}

export function validateBehaviorASTs(
  asts: BehaviorAST[],
): SemanticDiagnostic[] {
  const diagnostics: SemanticDiagnostic[] = [];

  for (const ast of asts) {
    switch (ast.kind) {
      case 'Workflow':
        diagnostics.push(...validateWorkflowAST(ast));
        break;
      case 'Event':
        diagnostics.push(...validateEventAST(ast));
        break;
      case 'Decision':
        diagnostics.push(...validateDecisionAST(ast));
        break;
    }
  }

  return diagnostics;
}

function validateWorkflowAST(wf: BehaviorAST & { kind: 'Workflow' }): SemanticDiagnostic[] {
  const d: SemanticDiagnostic[] = [];
  const stepIds = new Set(wf.steps.map(s => s.id));

  // Duplicate steps
  const seen = new Set<string>();
  for (const step of wf.steps) {
    if (seen.has(step.id)) {
      d.push(error('SEM-205', `Duplicate workflow step "${step.id}" in workflow "${wf.name}".`,
        { kind: 'step', name: step.id, parent: wf.name }));
    }
    seen.add(step.id);
  }

  if (wf.startStep && !stepIds.has(wf.startStep)) {
    d.push(error('SEM-104', `Workflow "${wf.name}": start step "${wf.startStep}" not found.`,
      { kind: 'workflow', name: wf.name }));
  }

  for (const es of wf.endSteps) {
    if (!stepIds.has(es)) {
      d.push(error('SEM-105', `Workflow "${wf.name}": end step "${es}" not found.`,
        { kind: 'workflow', name: wf.name }));
    }
  }

  const pSeen = new Set<string>();
  for (const p of wf.participants) {
    if (pSeen.has(p.name)) {
      d.push(error('SEM-206', `Duplicate participant "${p.name}" in workflow "${wf.name}".`,
        { kind: 'participant', name: p.name, parent: wf.name }));
    }
    pSeen.add(p.name);
  }

  return d;
}

function validateEventAST(ev: BehaviorAST & { kind: 'Event' }): SemanticDiagnostic[] {
  const d: SemanticDiagnostic[] = [];

  const handlerSet = new Set<string>();
  for (const h of ev.handlers) {
    if (handlerSet.has(h)) {
      d.push(error('SEM-207', `Duplicate event handler "${h}" in event "${ev.name}".`,
        { kind: 'handler', name: h, parent: ev.name }));
    }
    handlerSet.add(h);
  }

  const fieldSet = new Set<string>();
  for (const f of ev.payload) {
    if (fieldSet.has(f.name)) {
      d.push(error('SEM-208', `Duplicate payload field "${f.name}" in event "${ev.name}".`,
        { kind: 'payload_field', name: f.name, parent: ev.name }));
    }
    fieldSet.add(f.name);
  }

  return d;
}

function validateDecisionAST(dc: BehaviorAST & { kind: 'Decision' }): SemanticDiagnostic[] {
  const d: SemanticDiagnostic[] = [];

  const condSet = new Set<string>();
  for (const c of dc.cases) {
    if (condSet.has(c.condition)) {
      d.push(error('SEM-209', `Duplicate when condition "${c.condition}" in decision "${dc.name}".`,
        { kind: 'condition', name: c.condition, parent: dc.name }));
    }
    condSet.add(c.condition);
  }

  return d;
}
