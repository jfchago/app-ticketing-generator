// semantic/diagnostics.ts — Unified diagnostic types and helpers

export interface SemanticDiagnostic {
  code: DiagnosticCode;
  severity: 'error' | 'warning' | 'info';
  message: string;
  location?: SourceRef;
  related?: SourceRef;
  suggestion?: string;
}

export interface SourceRef {
  kind: SourceKind;
  name: string;
  parent?: string;
}

export type SourceKind =
  | 'entity'
  | 'attribute'
  | 'relationship'
  | 'enum'
  | 'use_case'
  | 'workflow'
  | 'event'
  | 'decision'
  | 'step'
  | 'participant'
  | 'handler'
  | 'payload_field'
  | 'condition'
  | 'application';

export type DiagnosticCode =
  | 'SEM-001' | 'SEM-002' | 'SEM-003'
  | 'SEM-101' | 'SEM-102' | 'SEM-103' | 'SEM-104' | 'SEM-105'
  | 'SEM-201' | 'SEM-202' | 'SEM-203' | 'SEM-204' | 'SEM-205' | 'SEM-206' | 'SEM-207' | 'SEM-208' | 'SEM-209'
  | 'SEM-301' | 'SEM-302' | 'SEM-303'
  | 'SEM-401' | 'SEM-402' | 'SEM-403';

export function createDiagnostic(
  code: DiagnosticCode,
  severity: 'error' | 'warning' | 'info',
  message: string,
  location?: SourceRef,
  related?: SourceRef,
  suggestion?: string,
): SemanticDiagnostic {
  return { code, severity, message, location, related, suggestion };
}

export function error(code: DiagnosticCode, message: string, location?: SourceRef, related?: SourceRef, suggestion?: string): SemanticDiagnostic {
  return createDiagnostic(code, 'error', message, location, related, suggestion);
}

export function warning(code: DiagnosticCode, message: string, location?: SourceRef, related?: SourceRef, suggestion?: string): SemanticDiagnostic {
  return createDiagnostic(code, 'warning', message, location, related, suggestion);
}

export function info(code: DiagnosticCode, message: string, location?: SourceRef, related?: SourceRef, suggestion?: string): SemanticDiagnostic {
  return createDiagnostic(code, 'info', message, location, related, suggestion);
}

export function hasErrors(diagnostics: SemanticDiagnostic[]): boolean {
  return diagnostics.some(d => d.severity === 'error');
}

export function formatDiagnostics(diagnostics: SemanticDiagnostic[]): string {
  if (diagnostics.length === 0) return '   No diagnostics.';
  const bySeverity = {
    error: diagnostics.filter(d => d.severity === 'error'),
    warning: diagnostics.filter(d => d.severity === 'warning'),
    info: diagnostics.filter(d => d.severity === 'info'),
  };
  const lines: string[] = [];
  lines.push(`   ${diagnostics.length} diagnostic(s): ${bySeverity.error.length} error(s), ${bySeverity.warning.length} warning(s), ${bySeverity.info.length} info`);
  for (const d of diagnostics) {
    const icon = d.severity === 'error' ? '✖' : d.severity === 'warning' ? '⚠' : 'ℹ';
    const loc = d.location ? ` [${d.location.kind}:${d.location.name}${d.location.parent ? ` in ${d.location.parent}` : ''}]` : '';
    lines.push(`   ${icon} ${d.code}${loc}: ${d.message}`);
  }
  return lines.join('\n');
}

export class SemanticDiagnosticsError extends Error {
  public readonly diagnostics: SemanticDiagnostic[];

  constructor(diagnostics: SemanticDiagnostic[]) {
    const errors = diagnostics.filter(d => d.severity === 'error');
    super(`Semantic validation failed with ${errors.length} error(s):\n${errors.map(e => `  - [${e.code}] ${e.message}`).join('\n')}`);
    this.name = 'SemanticDiagnosticsError';
    this.diagnostics = diagnostics;
  }
}
