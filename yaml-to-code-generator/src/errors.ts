// errors.ts — Typed error classes for the code generator pipeline
// Each carries structured metadata for CLI rendering and programmatic use.

export class GenerationError extends Error {
  public readonly severity: 'error' | 'warning' | 'info';
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    severity: 'error' | 'warning' | 'info' = 'error',
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GenerationError';
    this.code = code;
    this.severity = severity;
    this.details = details;
  }
}

export class ParseError extends GenerationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'PARSE_ERROR', 'error', details);
    this.name = 'ParseError';
  }
}

export class ValidationError extends GenerationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 'error', details);
    this.name = 'ValidationError';
  }
}

export class BehaviorParseError extends GenerationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'BEHAVIOR_PARSE_ERROR', 'warning', details);
    this.name = 'BehaviorParseError';
  }
}

export class TargetError extends GenerationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'TARGET_ERROR', 'error', details);
    this.name = 'TargetError';
  }
}
