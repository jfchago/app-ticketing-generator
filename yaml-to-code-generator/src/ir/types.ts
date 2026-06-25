// ir/types.ts — Intermediate Representation: language-agnostic domain model
// This is the contract that ALL template packs consume.
// Templates never touch raw YAML; they only see this normalized IR.

// ── Shared ───────────────────────────────────────────────────────────

export interface Metadata {
  [key: string]: unknown;
}

export interface Extensible {
  /** Arbitrary metadata for generated code (annotations, decorators, etc.) */
  metadata?: Metadata;
}

// ── IR Root ──────────────────────────────────────────────────────────

export interface IR extends Extensible {
  application: AppInfo;
  enums: EnumDef[];
  entities: EntityDef[];
  /** Top-level workflows (from `workflows:` in YAML) */
  workflows?: WorkflowDef[];
  /** Top-level events (from `events:` in YAML) */
  events?: EventDef[];
  /** Top-level decisions (from `decisions:` in YAML) */
  decisions?: DecisionDef[];
  /** Build-time feature flags derived from the domain */
  buildFeatures?: BuildFeatures;
}

export interface BuildFeatures {
  hasStateMachine: boolean;
  hasEvents: boolean;
  hasWorkflows: boolean;
  hasDecisions: boolean;
  hasValidation: boolean;
  hasRules: boolean;
}

export interface AppInfo extends Extensible {
  name: string;
  module: string;
  description?: string;
  basePackage: string;
  /** Application class name (non-alphanumeric chars stripped, e.g. "MiniHelpDesk") */
  appClassName: string;
}

export interface EnumDef extends Extensible {
  name: string;
  namePascal: string;
  nameCamel: string;
  values: EnumValueDef[];
}

export interface EnumValueDef extends Extensible {
  name: string;
  label: string;
}

export interface EntityDef extends Extensible {
  /** Original name from YAML (PascalCase) */
  name: string;
  /** camelCase: "ticketDetail" */
  nameCamel: string;
  /** PascalCase: "TicketDetail" (same as name currently, but explicit) */
  namePascal: string;
  /** kebab-case: "ticket-detail" */
  nameKebab: string;
  /** snake_case: "ticket_detail" */
  nameSnake: string;
  /** Database table name */
  table: string;
  /** Human-readable description */
  description: string;
  /** Stereotype (entity, value_object, aggregate_root, etc.) */
  stereotype: string;
  attributes: AttributeDef[];
  relationships: RelationshipDef[];
  useCases: UseCaseDef[];
  /** Convenience flags computed from use cases */
  hasCreate?: boolean;
  hasUpdate?: boolean;
  hasDelete?: boolean;
  hasGetAll?: boolean;
  hasGetById?: boolean;
  /** Primary key attribute reference */
  primaryKey?: AttributeDef;
  /** Transition table: maps current state to allowed next states (from YAML) */
  transitions?: Record<string, string[]>;
  /** Rules scoped to this entity (from YAML `rules:` field) */
  entityRules?: RuleDef[];
  /** Events emitted by this entity */
  entityEvents?: EventDef[];
}

export interface AttributeDef extends Extensible {
  /** Original name */
  name: string;
  /** PascalCase */
  namePascal: string;
  /** DSL type (String, Integer, Boolean, Date, or enum/entity name) */
  type: string;
  /** Is this attribute required (NOT NULL)? */
  required: boolean;
  /** Is this the primary key? */
  primary: boolean;
  /** Default value expression */
  defaultValue?: string;
  /** Does `type` reference a known enum? */
  isEnum: boolean;
  /** Does `type` reference another entity? */
  isEntityRef: boolean;
  /** Is this a primitive type? (String, Integer, Boolean, Date, etc.) */
  isPrimitive: boolean;
  /** Maximum length (for String types) */
  length?: number;
  /** Column name in database (may differ from attribute name) */
  column?: string;
  /** Is this attribute nullable? */
  nullable: boolean;
  /** Should this attribute have a UNIQUE database constraint? */
  unique?: boolean;
  /** TypeScript type string (e.g. "string", "number", "TicketStatus", "Ticket | null") */
  tsType: string;
}

export interface RelationshipDef extends Extensible {
  /** Name of the relationship */
  name: string;
  /** PascalCase name */
  namePascal: string;
  /** Type of relationship */
  type: RelationType;
  /** Target entity name */
  target: string;
  /** Target entity PascalCase */
  targetPascal: string;
  /** Foreign key column */
  foreignKey: string;
  /** Source cardinality */
  sourceCardinality: string;
  /** Target cardinality */
  targetCardinality: string;
}

export type RelationType = 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many';

export interface UseCaseDef extends Extensible {
  /** Original use case key (e.g., "get_all", "create", "assign_user") */
  name: string;
  /** CamelCase method name (e.g., "getAll", "create", "assignUser") */
  methodName: string;
  /** Semantic category: create, read, update, delete, action */
  category?: string;
  /** HTTP method for REST endpoints */
  httpMethod: HttpMethod;
  /** Does this use case require a request body/payload? */
  needsPayload: boolean;
  /** Does it require an ID parameter? */
  needsId: boolean;
  /** REST path suffix (e.g., "/{id}/status", "/{id}/comments") */
  pathSuffix: string;
  /** Human-readable action name */
  actionLabel: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// ── Behavioral IR Types (v2) ─────────────────────────────────────────

// ── Action ───────────────────────────────────────────────────────────

export interface ActionDef extends Extensible {
  /** Action type: create, update, notify, emit_event, etc. */
  type: ActionType;
  /** Target entity or resource */
  target?: string;
  /** Parameters keyed by name */
  params: Record<string, string>;
  /** Variable to store the result in (for workflow orchestration) */
  resultVariable?: string;
}

export type ActionType =
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

// ── Participant ──────────────────────────────────────────────────────

export interface ParticipantDef extends Extensible {
  role: 'actor' | 'system' | 'external';
  name: string;
}

// ── Workflow ─────────────────────────────────────────────────────────

export interface WorkflowDef extends Extensible {
  name: string;
  namePascal: string;
  nameCamel: string;
  participants: ParticipantDef[];
  steps: WorkflowStepDef[];
  startStep: string;
  endSteps: string[];
}

export interface WorkflowStepDef extends Extensible {
  id: string;
  name: string;
  label?: string;
  type: WorkflowStepType;
  actorName?: string;
  actions: ActionDef[];
  transitions: WorkflowTransitionDef[];
  timerExpression?: string;
  errorHandlers: ErrorHandlerDef[];
  deadline?: string;
  escalation?: string;
}

export type WorkflowStepType =
  | 'task'
  | 'human_task'
  | 'gateway'
  | 'event'
  | 'start'
  | 'end'
  | 'timer'
  | 'subprocess';

export interface WorkflowTransitionDef extends Extensible {
  targetStep: string;
  condition?: string;
  label?: string;
  isDefault?: boolean;
}

export interface ErrorHandlerDef extends Extensible {
  errorType: string;
  targetStep: string;
}

// ── Event ────────────────────────────────────────────────────────────

export interface EventDef extends Extensible {
  name: string;
  namePascal: string;
  nameCamel: string;
  source?: string;
  payload: EventPayloadFieldDef[];
  handlers: string[];
}

export interface EventPayloadFieldDef extends Extensible {
  name: string;
  type: string;
  required: boolean;
}

// ── Decision ─────────────────────────────────────────────────────────

export interface DecisionDef extends Extensible {
  name: string;
  namePascal: string;
  nameCamel: string;
  input?: string;
  cases: DecisionCaseDef[];
  defaultActions: ActionDef[];
}

export interface DecisionCaseDef extends Extensible {
  condition: string;
  actions: ActionDef[];
}

// ── Rule ─────────────────────────────────────────────────────────────

export interface RuleDef extends Extensible {
  name: string;
  namePascal: string;
  nameCamel: string;
  /** Store action that triggers this rule: update_status, create, etc. */
  on: string;
  /** Boolean expression evaluated in generated code */
  guard: string;
  /** Error message shown when rule fails */
  message: string;
}

export type BuildTool = 'gradle' | 'maven';
