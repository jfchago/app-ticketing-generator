// semantic/index.ts — Semantic Model entry point
// The main `buildSemanticModel()` function centralizes resolution and validation.
// It replaces the scattered checks in semantic-validator.ts and ast-validator.ts.

import type { ValidatedSpec } from '../validator/schema-validator.js';
import type { BehaviorAST } from '../lang/ast-types.js';
import type { SemanticModel } from './types.js';
import { resolveDomain } from './resolver.js';
import { validateDomain, validateBehaviorASTs } from './validator.js';
import { hasErrors, formatDiagnostics, SemanticDiagnosticsError } from './diagnostics.js';

export { hasErrors, formatDiagnostics, SemanticDiagnosticsError };
export type { SemanticModel };
export { toSnapshot } from './snapshot.js';
export type { SemanticSnapshot } from './snapshot.js';

export function buildSemanticModel(
  spec: ValidatedSpec,
  behaviorASTs?: BehaviorAST[],
  specPath?: string,
): SemanticModel {
  const { domain, diagnostics: resolveDiags } = resolveDomain(spec, behaviorASTs);

  const validationDiags = validateDomain(domain);

  let astDiags;
  if (behaviorASTs) {
    astDiags = validateBehaviorASTs(behaviorASTs);
  }

  const allDiagnostics = [
    ...resolveDiags,
    ...validationDiags,
    ...(astDiags ?? []),
  ];

  return {
    domain,
    diagnostics: allDiagnostics,
    meta: {
      specPath,
      specName: spec.application.name,
      source: spec,
    },
  };
}

export function buildSemanticModelOrThrow(
  spec: ValidatedSpec,
  behaviorASTs?: BehaviorAST[],
  specPath?: string,
): SemanticModel {
  const model = buildSemanticModel(spec, behaviorASTs, specPath);
  if (hasErrors(model.diagnostics)) {
    throw new SemanticDiagnosticsError(model.diagnostics);
  }
  return model;
}
