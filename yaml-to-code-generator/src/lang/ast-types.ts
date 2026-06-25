// lang/ast-types.ts — AST node interfaces for the behavior mini-DSLs
// Produced by the CST → AST transformer (ast-builder.ts)

// ── Shared ───────────────────────────────────────────────────────────

export interface SourceLocation {
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
}

export interface BehaviorNode {
  loc?: SourceLocation;
}

// ── Workflow ─────────────────────────────────────────────────────────

export interface WorkflowAST extends BehaviorNode {
  kind: 'Workflow';
  name: string;
  participants: ParticipantAST[];
  steps: WorkflowStepAST[];
  startStep: string;
  endSteps: string[];
}

export interface ParticipantAST {
  role: 'actor' | 'system' | 'external';
  name: string;
}

export interface WorkflowStepAST extends BehaviorNode {
  kind: 'WorkflowStep';
  id: string;
  name: string;
  label?: string;
  type: 'task' | 'human_task' | 'gateway' | 'event' | 'start' | 'end' | 'timer' | 'subprocess';
  actorName?: string;
  actions: ActionAST[];
  transitions: {
    targetStep: string;
    condition?: string;
    label?: string;
    isDefault?: boolean;
  }[];
  timerExpression?: string;
  errorHandlers: { errorType: string; targetStep: string }[];
  deadline?: string;
  escalation?: string;
}

export interface ActionAST extends BehaviorNode {
  type:
    | 'create'
    | 'update'
    | 'delete'
    | 'notify'
    | 'emit_event'
    | 'call_service'
    | 'assign'
    | 'validate'
    | 'log'
    | 'schedule';
  target?: string;
  params: Record<string, string>;
  resultVariable?: string;
}

// ── Event ────────────────────────────────────────────────────────────

export interface EventAST extends BehaviorNode {
  kind: 'Event';
  name: string;
  source?: string;
  payload: { name: string; type: string; required: boolean }[];
  handlers: string[];
}

// ── Decision ─────────────────────────────────────────────────────────

export interface DecisionAST extends BehaviorNode {
  kind: 'Decision';
  name: string;
  input?: string;
  cases: { condition: string; actions: ActionAST[] }[];
  defaultActions: ActionAST[];
}

// ── Union type ───────────────────────────────────────────────────────

export type BehaviorAST = WorkflowAST | EventAST | DecisionAST;
