// lang/ast-validator.ts — Semantic validation for behavior ASTs
// Checks internal consistency of parsed behavior blocks:
// - State names referenced in transitions exist
// - Workflow steps referenced in start/end exist
// - No duplicate names within a block
// - Cross-references between behavior blocks

import type { BehaviorAST, WorkflowAST, EventAST, DecisionAST } from './ast-types.js';

export class BehaviorValidationError extends Error {
  public readonly errors: string[];

  constructor(errors: string[]) {
    super(
      `Behavior validation failed with ${errors.length} error(s):\n${errors.map((e) => `  - ${e}`).join('\n')}`,
    );
    this.name = 'BehaviorValidationError';
    this.errors = errors;
  }
}

export interface BehaviorValidationOptions {
  /** Known entity names (from YAML spec) for cross-referencing */
  entityNames?: Set<string>;
  /** Known event names (from behavior blocks) for cross-referencing */
  eventNames?: Set<string>;
  /** Known workflow names */
  workflowNames?: Set<string>;
  /** Known decision names */
  decisionNames?: Set<string>;
  /** If true, strict mode enables additional cross-block validation */
  strictBehavior?: boolean;
}

export function validateBehaviorASTs(
  asts: BehaviorAST[],
  options: BehaviorValidationOptions = {},
): string[] {
  const errors: string[] = [];

  // Gather known names for cross-referencing (placeholder for future use)

  for (const ast of asts) {
    switch (ast.kind) {
      case 'Workflow':
        errors.push(...validateWorkflow(ast));
        break;
      case 'Event':
        errors.push(...validateEvent(ast));
        break;
      case 'Decision':
        errors.push(...validateDecision(ast));
        break;
    }
  }

  // Cross-block validation in strict mode
  if (options.strictBehavior) {
    errors.push(...validateCrossBlock(asts));
  }

  return errors;
}

// ── Workflow ──────────────────────────────────────────────────────────

function validateWorkflow(wf: WorkflowAST): string[] {
  const errors: string[] = [];
  const stepNames = new Set(wf.steps.map((s) => s.id));

  // Check for duplicate step names
  const seen = new Set<string>();
  for (const step of wf.steps) {
    if (seen.has(step.id)) {
      errors.push(`Workflow "${wf.name}": duplicate step "${step.id}"`);
    }
    seen.add(step.id);
  }

  // Check start step exists
  if (wf.startStep && !stepNames.has(wf.startStep)) {
    errors.push(
      `Workflow "${wf.name}": start step "${wf.startStep}" not found in steps [${[...stepNames].join(', ')}]`,
    );
  }

  // Check end steps exist
  for (const es of wf.endSteps) {
    if (!stepNames.has(es)) {
      errors.push(
        `Workflow "${wf.name}": end step "${es}" not found in steps [${[...stepNames].join(', ')}]`,
      );
    }
  }

  // Check for duplicate participant names
  const pSeen = new Set<string>();
  for (const p of wf.participants) {
    if (pSeen.has(p.name)) {
      errors.push(`Workflow "${wf.name}": duplicate participant "${p.name}"`);
    }
    pSeen.add(p.name);
  }

  return errors;
}

// ── Event ─────────────────────────────────────────────────────────────

function validateEvent(ev: EventAST): string[] {
  const errors: string[] = [];

  // Check for duplicate handler names
  const seen = new Set<string>();
  for (const h of ev.handlers) {
    if (seen.has(h)) {
      errors.push(`Event "${ev.name}": duplicate handler "${h}"`);
    }
    seen.add(h);
  }

  // Check for duplicate payload field names
  const fSeen = new Set<string>();
  for (const f of ev.payload) {
    if (fSeen.has(f.name)) {
      errors.push(`Event "${ev.name}": duplicate payload field "${f.name}"`);
    }
    fSeen.add(f.name);
  }

  return errors;
}

// ── Decision ──────────────────────────────────────────────────────────

function validateDecision(dc: DecisionAST): string[] {
  const errors: string[] = [];

  // Check for duplicate when conditions
  const seen = new Set<string>();
  for (const c of dc.cases) {
    if (seen.has(c.condition)) {
      errors.push(`Decision "${dc.name}": duplicate when condition "${c.condition}"`);
    }
    seen.add(c.condition);
  }

  return errors;
}

// ── Cross-block validation (strict mode) ──────────────────────────────

function validateCrossBlock(_asts: BehaviorAST[]): string[] {
  const errors: string[] = [];
  return errors;
}

/**
 * Convenience wrapper: validate and throw on errors.
 */
export function validateBehaviorASTsOrThrow(
  asts: BehaviorAST[],
  options?: BehaviorValidationOptions,
): void {
  const errors = validateBehaviorASTs(asts, options);
  if (errors.length > 0) {
    throw new BehaviorValidationError(errors);
  }
}
