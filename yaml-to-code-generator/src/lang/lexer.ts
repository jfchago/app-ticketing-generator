// lang/lexer.ts — Chevrotain Lexer for the behavior DSL
// Tokenizes behavior block source text into a stream of tokens

import { Lexer } from "chevrotain";
import { allTokens } from "./tokens.js";

export const behaviorLexer = new Lexer(allTokens, {
  // Ensure the lexer does not produce line/column tracking for performance
  positionTracking: "full",
});

export function tokenize(
  source: string,
): ReturnType<typeof behaviorLexer.tokenize> {
  return behaviorLexer.tokenize(source);
}
