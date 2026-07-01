// lang/parser.ts — Chevrotain parser for the behavior mini-DSLs
// 3 entry rules: workflow, event, decision

import { CstParser } from 'chevrotain';
import {
  Workflow,
  Event,
  Decision,
  Step,
  Start,
  End,
  Does,
  Actor,
  System,
  External,
  Await,
  When,
  Else,
  If,
  After,
  Source,
  Payload,
  Handlers,
  TrackedFields,
  Input,
  LCurly,
  RCurly,
  LBracket,
  RBracket,
  Colon,
  Semicolon,
  Comma,
  Arrow,
  At,
  Identifier,
  StringLiteral,
  DurationLiteral,
  allTokens,
} from './tokens.js';

class BehaviorParser extends CstParser {
  constructor() {
    super(allTokens, {
      recoveryEnabled: true,
      nodeLocationTracking: 'full',
    });
    this.performSelfAnalysis();
  }

  // ── Entry rules ─────────────────────────────────────────────────

  workflowBlock = this.RULE('workflowBlock', () => {
    this.CONSUME(Workflow);
    this.CONSUME(Identifier);
    this.CONSUME(LCurly);
    this.SUBRULE(this.wfBody);
    this.CONSUME(RCurly);
  });

  eventBlock = this.RULE('eventBlock', () => {
    this.CONSUME(Event);
    this.CONSUME(Identifier);
    this.CONSUME(LCurly);
    this.SUBRULE(this.evBody);
    this.CONSUME(RCurly);
  });

  decisionBlock = this.RULE('decisionBlock', () => {
    this.CONSUME(Decision);
    this.CONSUME(Identifier);
    this.CONSUME(LCurly);
    this.SUBRULE(this.dcBody);
    this.CONSUME(RCurly);
  });

  // ── Workflow ───────────────────────────────────────────────────

  private wfBody = this.RULE('wfBody', () => {
    this.SUBRULE(this.wfParticipants);
    this.SUBRULE(this.wfStart);
    this.SUBRULE(this.wfSteps);
    this.SUBRULE(this.wfEnd);
  });

  private wfParticipants = this.RULE('wfParticipants', () => {
    this.MANY(() => this.SUBRULE(this.wfParticipant));
  });

  private wfParticipant = this.RULE('wfParticipant', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.wfActor) },
      { ALT: () => this.SUBRULE(this.wfSys) },
      { ALT: () => this.SUBRULE(this.wfExt) },
    ]);
    this.SUBRULE(this.semi);
  });

  private wfActor = this.RULE('wfActor', () => {
    this.CONSUME(Actor);
    this.CONSUME(Identifier);
  });

  private wfSys = this.RULE('wfSys', () => {
    this.CONSUME(System);
    this.CONSUME(Identifier);
  });

  private wfExt = this.RULE('wfExt', () => {
    this.CONSUME(External);
    this.CONSUME(Identifier);
  });

  private wfStart = this.RULE('wfStart', () => {
    this.OPTION(() => {
      this.CONSUME(Start);
      this.CONSUME(Arrow);
      this.CONSUME(Identifier);
      this.SUBRULE(this.semi);
    });
  });

  private wfSteps = this.RULE('wfSteps', () => {
    this.AT_LEAST_ONE(() => this.SUBRULE(this.wfStep));
  });

  private wfStep = this.RULE('wfStep', () => {
    this.CONSUME(Step);
    this.CONSUME(Identifier);
    this.SUBRULE(this.wfStepLabel);
    this.CONSUME(LCurly);
    this.SUBRULE(this.wfStepContentSection);
    this.CONSUME(RCurly);
  });

  private wfStepLabel = this.RULE('wfStepLabel', () => {
    this.OPTION(() => {
      this.CONSUME(Colon);
      this.CONSUME(StringLiteral);
    });
  });

  private wfStepContentSection = this.RULE('wfStepContentSection', () => {
    this.MANY(() => this.SUBRULE(this.wfStepContent));
  });

  private wfStepContent = this.RULE('wfStepContent', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.actionStatement) },
      { ALT: () => this.SUBRULE(this.wfDecisionStatement) },
      { ALT: () => this.SUBRULE(this.wfAwaitStatement) },
      { ALT: () => this.SUBRULE(this.wfTimerStatement) },
    ]);
  });

  private actionStatement = this.RULE('actionStatement', () => {
    this.SUBRULE(this.actionActor);
    this.CONSUME(Does);
    this.CONSUME(Identifier);
    this.OPTION(() => this.CONSUME2(Identifier));
    this.SUBRULE(this.semi);
  });

  private actionActor = this.RULE('actionActor', () => {
    this.OR([
      { ALT: () => this.CONSUME(Identifier) },
      { ALT: () => this.CONSUME(Actor) },
      { ALT: () => this.CONSUME(System) },
      { ALT: () => this.CONSUME(External) },
    ]);
  });

  private wfDecisionStatement = this.RULE('wfDecisionStatement', () => {
    this.CONSUME(If);
    this.CONSUME(Identifier);
    this.CONSUME(LCurly);
    this.MANY(() => this.SUBRULE(this.actionStatement));
    this.CONSUME(RCurly);
    this.OPTION(() => this.SUBRULE(this.wfElseClause));
  });

  private wfElseClause = this.RULE('wfElseClause', () => {
    this.CONSUME(Else);
    this.CONSUME(LCurly);
    this.MANY(() => this.SUBRULE(this.actionStatement));
    this.CONSUME(RCurly);
  });

  private wfAwaitStatement = this.RULE('wfAwaitStatement', () => {
    this.CONSUME(Await);
    this.CONSUME(Identifier);
    this.SUBRULE(this.semi);
  });

  private wfTimerStatement = this.RULE('wfTimerStatement', () => {
    this.CONSUME(After);
    this.OR([
      { ALT: () => this.CONSUME(DurationLiteral) },
      { ALT: () => this.CONSUME(StringLiteral) },
    ]);
    this.CONSUME(LCurly);
    this.MANY(() => this.SUBRULE(this.actionStatement));
    this.CONSUME(RCurly);
  });

  private wfEnd = this.RULE('wfEnd', () => {
    this.OPTION(() => {
      this.CONSUME(End);
      this.CONSUME(Identifier);
      this.SUBRULE(this.semi);
    });
  });

  // ── Event ───────────────────────────────────────────────────────

  private evBody = this.RULE('evBody', () => {
    this.SUBRULE(this.evSource);
    this.SUBRULE(this.evPayload);
    this.SUBRULE(this.evTrackedFields);
    this.SUBRULE(this.evHandlers);
  });

  private evSource = this.RULE('evSource', () => {
    this.OPTION(() => {
      this.CONSUME(Source);
      this.CONSUME(Colon);
      this.CONSUME(Identifier);
      this.SUBRULE(this.semi);
    });
  });

  private evPayload = this.RULE('evPayload', () => {
    this.OPTION(() => this.SUBRULE(this.evPayloadBody));
  });

  private evPayloadBody = this.RULE('evPayloadBody', () => {
    this.CONSUME(Payload);
    this.CONSUME(LCurly);
    this.SUBRULE(this.evPayloadFields);
    this.CONSUME(RCurly);
  });

  private evPayloadFields = this.RULE('evPayloadFields', () => {
    this.MANY(() => this.SUBRULE(this.evPayloadField));
  });

  private evPayloadField = this.RULE('evPayloadField', () => {
    this.CONSUME(Identifier);
    this.CONSUME(Colon);
    this.SUBRULE(this.evPayloadFieldType);
    this.SUBRULE(this.evPayloadFieldAnnotations);
    this.SUBRULE(this.semi);
  });

  private evPayloadFieldType = this.RULE('evPayloadFieldType', () => {
    this.CONSUME(Identifier);
  });

  private evPayloadFieldAnnotations = this.RULE('evPayloadFieldAnnotations', () => {
    this.MANY(() => this.SUBRULE(this.evPayloadFieldAnnotation));
  });

  private evPayloadFieldAnnotation = this.RULE('evPayloadFieldAnnotation', () => {
    this.CONSUME(At);
    this.CONSUME(Identifier);
  });

  private evHandlers = this.RULE('evHandlers', () => {
    this.OPTION(() => this.SUBRULE(this.evHandlersBody));
  });

  private evHandlersBody = this.RULE('evHandlersBody', () => {
    this.CONSUME(Handlers);
    this.CONSUME(Colon);
    this.CONSUME(LBracket);
    this.SUBRULE(this.evHandlerList);
    this.CONSUME(RBracket);
    this.SUBRULE(this.semi);
  });

  private evHandlerList = this.RULE('evHandlerList', () => {
    this.AT_LEAST_ONE_SEP({
      SEP: Comma,
      DEF: () => this.CONSUME(Identifier),
    });
  });

  private evTrackedFields = this.RULE('evTrackedFields', () => {
    this.OPTION(() => this.SUBRULE(this.evTrackedFieldsBody));
  });

  private evTrackedFieldsBody = this.RULE('evTrackedFieldsBody', () => {
    this.CONSUME(TrackedFields);
    this.CONSUME(Colon);
    this.CONSUME(LBracket);
    this.SUBRULE(this.evTrackedFieldList);
    this.CONSUME(RBracket);
    this.SUBRULE(this.semi);
  });

  private evTrackedFieldList = this.RULE('evTrackedFieldList', () => {
    this.AT_LEAST_ONE_SEP({
      SEP: Comma,
      DEF: () => this.CONSUME(Identifier),
    });
  });

  // ── Decision ────────────────────────────────────────────────────

  private dcBody = this.RULE('dcBody', () => {
    this.SUBRULE(this.dcInput);
    this.SUBRULE(this.dcWhenClauses);
    this.SUBRULE(this.dcElseClause);
  });

  private dcInput = this.RULE('dcInput', () => {
    this.OPTION(() => {
      this.CONSUME(Input);
      this.CONSUME(Colon);
      this.CONSUME(Identifier);
      this.SUBRULE(this.semi);
    });
  });

  private dcWhenClauses = this.RULE('dcWhenClauses', () => {
    this.MANY(() => this.SUBRULE(this.dcWhenClause));
  });

  private dcWhenClause = this.RULE('dcWhenClause', () => {
    this.CONSUME(When);
    this.CONSUME(Identifier);
    this.CONSUME(LCurly);
    this.MANY(() => this.SUBRULE(this.actionStatement));
    this.CONSUME(RCurly);
  });

  private dcElseClause = this.RULE('dcElseClause', () => {
    this.OPTION(() => this.SUBRULE(this.dcElseBody));
  });

  private dcElseBody = this.RULE('dcElseBody', () => {
    this.CONSUME(Else);
    this.CONSUME(LCurly);
    this.MANY(() => this.SUBRULE(this.actionStatement));
    this.CONSUME(RCurly);
  });

  // ── Shared helpers ──────────────────────────────────────────────

  private semi = this.RULE('semi', () => {
    this.OPTION(() => this.CONSUME(Semicolon));
  });
}

export const parser = new BehaviorParser();
