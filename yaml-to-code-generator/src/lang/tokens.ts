// lang/tokens.ts — Chevrotain lexer token definitions for the behavior DSL
// Defines tokens for 3 mini-DSLs: workflow, event, decision

import { createToken, Lexer } from 'chevrotain';

// ── Keywords (all use explicit lookahead/lookbehind instead of \b) ────

const wordBoundary = (s: string) => `(?<![a-zA-Z0-9_])${s}(?![a-zA-Z0-9_])`;

export const Workflow = createToken({
  name: 'Workflow',
  pattern: new RegExp(wordBoundary('workflow')),
});
export const Event = createToken({
  name: 'Event',
  pattern: new RegExp(wordBoundary('event')),
});
export const Decision = createToken({
  name: 'Decision',
  pattern: new RegExp(wordBoundary('decision')),
});

export const Step = createToken({
  name: 'Step',
  pattern: new RegExp(wordBoundary('step')),
});
export const Start = createToken({
  name: 'Start',
  pattern: new RegExp(wordBoundary('start')),
});
export const End = createToken({
  name: 'End',
  pattern: new RegExp(wordBoundary('end')),
});

export const Action = createToken({
  name: 'Action',
  pattern: new RegExp(wordBoundary('action')),
});
export const Does = createToken({
  name: 'Does',
  pattern: new RegExp(wordBoundary('does')),
});

export const Actor = createToken({
  name: 'Actor',
  pattern: new RegExp(wordBoundary('actor')),
});
export const System = createToken({
  name: 'System',
  pattern: new RegExp(wordBoundary('system')),
});
export const External = createToken({
  name: 'External',
  pattern: new RegExp(wordBoundary('external')),
});

export const Await = createToken({
  name: 'Await',
  pattern: new RegExp(wordBoundary('await')),
});
export const When = createToken({
  name: 'When',
  pattern: new RegExp(wordBoundary('when')),
});
export const Else = createToken({
  name: 'Else',
  pattern: new RegExp(wordBoundary('else')),
});
export const Source = createToken({
  name: 'Source',
  pattern: new RegExp(wordBoundary('source')),
});
export const Payload = createToken({
  name: 'Payload',
  pattern: new RegExp(wordBoundary('payload')),
});
export const Handlers = createToken({
  name: 'Handlers',
  pattern: new RegExp(wordBoundary('handlers')),
});
export const Input = createToken({
  name: 'Input',
  pattern: new RegExp(wordBoundary('input')),
});
export const Time = createToken({
  name: 'Time',
  pattern: new RegExp(wordBoundary('time')),
});
export const Within = createToken({
  name: 'Within',
  pattern: new RegExp(wordBoundary('within')),
});
export const If = createToken({
  name: 'If',
  pattern: new RegExp(wordBoundary('if')),
});
export const After = createToken({
  name: 'After',
  pattern: new RegExp(wordBoundary('after')),
});

// ── Syntax ────────────────────────────────────────────────────────────

export const LCurly = createToken({ name: 'LCurly', pattern: /{/ });
export const RCurly = createToken({ name: 'RCurly', pattern: /}/ });
export const LParen = createToken({ name: 'LParen', pattern: /\(/ });
export const RParen = createToken({ name: 'RParen', pattern: /\)/ });
export const LBracket = createToken({ name: 'LBracket', pattern: /\[/ });
export const RBracket = createToken({ name: 'RBracket', pattern: /]/ });
export const Colon = createToken({ name: 'Colon', pattern: /:/ });
export const Semicolon = createToken({ name: 'Semicolon', pattern: /;/ });
export const Comma = createToken({ name: 'Comma', pattern: /,/ });
export const Arrow = createToken({ name: 'Arrow', pattern: /->/ });
export const Assign = createToken({ name: 'Assign', pattern: /=/ });
export const At = createToken({ name: 'At', pattern: /@/ });
export const Pipe = createToken({ name: 'Pipe', pattern: /\|/ });
export const Dot = createToken({ name: 'Dot', pattern: /\./ });

// ── Values ────────────────────────────────────────────────────────────

export const Identifier = createToken({
  name: 'Identifier',
  pattern: /[a-zA-Z_]\w*/,
});

export const StringLiteral = createToken({
  name: 'StringLiteral',
  pattern: /"([^"\\]|\\.)*"/,
});

export const NumberLiteral = createToken({
  name: 'NumberLiteral',
  pattern: /\d+(\.\d+)?/,
});

export const BooleanLiteral = createToken({
  name: 'BooleanLiteral',
  pattern: /(?<![a-zA-Z0-9_])(true|false)(?![a-zA-Z0-9_])/,
});

export const DurationLiteral = createToken({
  name: 'DurationLiteral',
  pattern: /\d+[smhdw]/,
});

// ── Whitespace & Comments (skipped) ───────────────────────────────────

export const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});

export const LineComment = createToken({
  name: 'LineComment',
  pattern: /\/\/[^\n]*/,
  group: Lexer.SKIPPED,
});

// ── Ordered token array ───────────────────────────────────────────────

export const allTokens = [
  // Keywords (must come before Identifier)
  Workflow,
  Event,
  Decision,
  Step,
  Start,
  End,
  Action,
  Does,
  Actor,
  System,
  External,
  Await,
  When,
  Else,
  Source,
  Payload,
  Handlers,
  Input,
  Time,
  Within,
  If,
  After,
  // Values
  BooleanLiteral,
  DurationLiteral,
  NumberLiteral,
  StringLiteral,
  Identifier,
  // Syntax
  LCurly,
  RCurly,
  LParen,
  RParen,
  LBracket,
  RBracket,
  Colon,
  Semicolon,
  Comma,
  Arrow,
  Assign,
  At,
  Pipe,
  Dot,
  // Skipped
  WhiteSpace,
  LineComment,
];
