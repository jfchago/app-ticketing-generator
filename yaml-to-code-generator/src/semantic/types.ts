// semantic/types.ts — Semantic Model types
// Extended domain model that sits between ValidatedSpec and IR.
// Contains resolved symbols, references, computed flags, and diagnostics.

import type { ValidatedSpec } from "../validator/schema-validator.js";

export interface SemanticModel {
  domain: ResolvedDomain;
  diagnostics: SemanticDiagnostic[];
  meta: SemanticMeta;
}

export interface SemanticMeta {
  specPath?: string;
  specName: string;
  source: ValidatedSpec;
}

export interface ResolvedDomain {
  application: ResolvedAppInfo;
  enums: ResolvedEnum[];
  entities: ResolvedEntity[];
  workflows: ResolvedWorkflow[];
  events: ResolvedEvent[];
  decisions: ResolvedDecision[];
  buildFeatures: BuildFeatures;
}

export interface ResolvedAppInfo {
  name: string;
  module: string;
  description?: string;
  basePackage: string;
  appClassName: string;
}

export interface BuildFeatures {
  hasStateMachine: boolean;
  hasEvents: boolean;
  hasWorkflows: boolean;
  hasDecisions: boolean;
  hasValidation: boolean;
  hasRules: boolean;
}

export interface ResolvedEnum {
  name: string;
  namePascal: string;
  nameCamel: string;
  values: ResolvedEnumValue[];
}

export interface ResolvedEnumValue {
  name: string;
  label: string;
}

export interface ResolvedEntity {
  name: string;
  nameCamel: string;
  namePascal: string;
  nameKebab: string;
  nameSnake: string;
  table: string;
  description: string;
  stereotype: string;
  attributes: ResolvedAttribute[];
  relationships: ResolvedRelationship[];
  useCases: ResolvedUseCase[];
  primaryKey: ResolvedAttribute | null;
  transitions?: Record<string, string[]>;
  entityRules: ResolvedRule[];
  entityEvents: ResolvedEvent[];

  hasCreate: boolean;
  hasUpdate: boolean;
  hasDelete: boolean;
  hasGetAll: boolean;
  hasGetById: boolean;
  hasComments: boolean;
  relatedEntities: string[];
  commentEntity: string | null;
  statePropertyName: string;
}

export interface ResolvedAttribute {
  name: string;
  namePascal: string;
  type: string;
  resolvedType: ResolvedType;
  required: boolean;
  primary: boolean;
  defaultValue?: string;
  length?: number;
  column: string;
  nullable: boolean;
  unique: boolean;
  fieldRole?: FieldRole;
  tsType: string;
}

export interface ResolvedType {
  kind: "primitive" | "enum" | "entity" | "unknown";
  ref: string;
}

export type FieldRole =
  | "id"
  | "status"
  | "priority"
  | "assignee"
  | "timestamp"
  | "text"
  | "field";

export interface ResolvedRelationship {
  name: string;
  namePascal: string;
  type: string;
  target: string;
  targetPascal: string;
  foreignKey: string;
  sourceCardinality: string;
  targetCardinality: string;
  resolvedTarget: ResolvedTarget;
}

export interface ResolvedTarget {
  kind: "resolved" | "unresolved";
  ref: string;
}

export interface ResolvedUseCase {
  name: string;
  methodName: string;
  httpMethod: string;
  needsPayload: boolean;
  needsId: boolean;
  pathSuffix: string;
  actionLabel: string;
  category: UseCaseCategory;
  requiresComment: boolean;
  requiresUser: boolean;
  stateMutation: boolean;
  resolved: boolean;
}

export type UseCaseCategory =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "action";

export interface ResolvedRule {
  name: string;
  namePascal: string;
  nameCamel: string;
  on: string;
  guard: string;
  message: string;
}

export interface ResolvedWorkflow {
  name: string;
  namePascal: string;
  nameCamel: string;
  participants: ResolvedParticipant[];
  steps: ResolvedWorkflowStep[];
  startStep: string;
  endSteps: string[];
}

export interface ResolvedParticipant {
  role: string;
  name: string;
}

export interface ResolvedWorkflowStep {
  id: string;
  name: string;
  label?: string;
  type: string;
  actorName?: string;
  actions: ResolvedAction[];
  transitions: ResolvedTransition[];
  timerExpression?: string;
  errorHandlers: ResolvedErrorHandler[];
  deadline?: string;
  escalation?: string;
}

export interface ResolvedAction {
  type: string;
  target?: string;
  params: Record<string, string>;
  resultVariable?: string;
}

export interface ResolvedTransition {
  targetStep: string;
  condition?: string;
  label?: string;
  isDefault?: boolean;
}

export interface ResolvedErrorHandler {
  errorType: string;
  targetStep: string;
}

export interface ResolvedEvent {
  name: string;
  namePascal: string;
  nameCamel: string;
  source?: string;
  payload: ResolvedPayloadField[];
  handlers: string[];
  resolvedSource?: "entity" | "unresolved";
}

export interface ResolvedPayloadField {
  name: string;
  type: string;
  required: boolean;
}

export interface ResolvedDecision {
  name: string;
  namePascal: string;
  nameCamel: string;
  input?: string;
  cases: ResolvedDecisionCase[];
  defaultActions: ResolvedAction[];
}

export interface ResolvedDecisionCase {
  condition: string;
  actions: ResolvedAction[];
}

export type ResolvedSymbol =
  | { kind: "entity"; ref: ResolvedEntity }
  | { kind: "enum"; ref: ResolvedEnum }
  | { kind: "workflow"; ref: ResolvedWorkflow }
  | { kind: "event"; ref: ResolvedEvent }
  | { kind: "decision"; ref: ResolvedDecision };

import type { SemanticDiagnostic } from "./diagnostics.js";
