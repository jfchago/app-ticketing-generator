// semantic/snapshot.ts — Serialize SemanticModel to JSON for observability
// Produces the format defined in docs/semantic/semantic-snapshot-format.md

import type {
  SemanticModel,
  ResolvedEntity,
  ResolvedEnum,
  ResolvedWorkflow,
  ResolvedEvent,
  ResolvedDecision,
} from './types.js';

export interface SemanticSnapshot {
  meta: SnapshotMeta;
  summary: SnapshotSummary;
  entities: EntitySnapshot[];
  enums: EnumSnapshot[];
  diagnostics: DiagnosticSnapshot[];
  behavior?: {
    workflows?: WorkflowSnapshot[];
    events?: EventSnapshot[];
    decisions?: DecisionSnapshot[];
  };
}

interface SnapshotMeta {
  tool: string;
  version: number;
  timestamp: string;
  specPath?: string;
  specName: string;
}

interface SnapshotSummary {
  entities: number;
  enums: number;
  attributes: number;
  relationships: number;
  useCases: number;
  workflows: number;
  events: number;
  decisions: number;
  diagnostics: { error: number; warning: number; info: number };
  flags: {
    hasStateMachine: boolean;
    hasEvents: boolean;
    hasWorkflows: boolean;
    hasDecisions: boolean;
  };
}

interface EntitySnapshot {
  name: string;
  nameCamel: string;
  namePascal: string;
  stereotype: string;
  table: string;
  pkAttribute: string | null;
  pkType: string | null;
  attributeCount: number;
  relationshipCount: number;
  useCaseCount: number;
  flags: {
    hasCreate: boolean;
    hasUpdate: boolean;
    hasDelete: boolean;
    hasGetAll: boolean;
    hasGetById: boolean;
    hasComments: boolean;
    relatedEntities: string[];
  };
  attributes: AttributeSnapshot[];
  relationships: RelationshipSnapshot[];
  useCases: UseCaseSnapshot[];
}

interface AttributeSnapshot {
  name: string;
  type: string;
  resolvedType: { kind: string; ref: string };
  fieldRole: string;
  required: boolean;
  primary: boolean;
}

interface RelationshipSnapshot {
  name: string;
  target: string;
  resolvedTarget: { kind: string; ref: string };
  type: string;
}

interface UseCaseSnapshot {
  name: string;
  methodName: string;
  httpMethod: string;
  category: string;
  pathSuffix: string;
  requiresComment: boolean;
  requiresUser: boolean;
  stateMutation: boolean;
}

interface EnumSnapshot {
  name: string;
  valueCount: number;
  values: { name: string; label: string }[];
}

interface DiagnosticSnapshot {
  code: string;
  severity: string;
  message: string;
  location?: { kind: string; name: string; parent?: string };
  related?: { kind: string; name: string; parent?: string };
}

interface WorkflowSnapshot {
  name: string;
  participantCount: number;
  stepCount: number;
  startStep: string;
  endSteps: string[];
}

interface EventSnapshot {
  name: string;
  source?: string;
  payloadFieldCount: number;
  handlerCount: number;
}

interface DecisionSnapshot {
  name: string;
  input?: string;
  caseCount: number;
}

export function toSnapshot(model: SemanticModel): SemanticSnapshot {
  const domain = model.domain;

  const diagCounts = {
    error: model.diagnostics.filter((d) => d.severity === 'error').length,
    warning: model.diagnostics.filter((d) => d.severity === 'warning').length,
    info: model.diagnostics.filter((d) => d.severity === 'info').length,
  };

  return {
    meta: {
      tool: 'yaml2code-semantic',
      version: 1,
      timestamp: new Date().toISOString(),
      specPath: model.meta.specPath,
      specName: model.meta.specName,
    },
    summary: {
      entities: domain.entities.length,
      enums: domain.enums.length,
      attributes: domain.entities.reduce((sum, e) => sum + e.attributes.length, 0),
      relationships: domain.entities.reduce((sum, e) => sum + e.relationships.length, 0),
      useCases: domain.entities.reduce((sum, e) => sum + e.useCases.length, 0),
      workflows: domain.workflows.length,
      events: domain.events.length,
      decisions: domain.decisions.length,
      diagnostics: diagCounts,
      flags: {
        hasStateMachine: domain.buildFeatures.hasStateMachine,
        hasEvents: domain.buildFeatures.hasEvents,
        hasWorkflows: domain.buildFeatures.hasWorkflows,
        hasDecisions: domain.buildFeatures.hasDecisions,
      },
    },
    entities: domain.entities.map(entityToSnapshot),
    enums: domain.enums.map(enumToSnapshot),
    diagnostics: model.diagnostics.map((d) => ({
      code: d.code,
      severity: d.severity,
      message: d.message,
      location: d.location
        ? {
            kind: d.location.kind,
            name: d.location.name,
            parent: d.location.parent,
          }
        : undefined,
      related: d.related
        ? {
            kind: d.related.kind,
            name: d.related.name,
            parent: d.related.parent,
          }
        : undefined,
    })),
    behavior: {
      workflows: domain.workflows.length > 0 ? domain.workflows.map(workflowToSnapshot) : undefined,
      events: domain.events.length > 0 ? domain.events.map(eventToSnapshot) : undefined,
      decisions: domain.decisions.length > 0 ? domain.decisions.map(decisionToSnapshot) : undefined,
    },
  };
}

function entityToSnapshot(e: ResolvedEntity): EntitySnapshot {
  return {
    name: e.name,
    nameCamel: e.nameCamel,
    namePascal: e.namePascal,
    stereotype: e.stereotype,
    table: e.table,
    pkAttribute: e.primaryKey?.name ?? null,
    pkType: e.primaryKey?.type ?? null,
    attributeCount: e.attributes.length,
    relationshipCount: e.relationships.length,
    useCaseCount: e.useCases.length,
    flags: {
      hasCreate: e.hasCreate,
      hasUpdate: e.hasUpdate,
      hasDelete: e.hasDelete,
      hasGetAll: e.hasGetAll,
      hasGetById: e.hasGetById,
      hasComments: e.hasComments,
      relatedEntities: e.relatedEntities,
    },
    attributes: e.attributes.map((a) => ({
      name: a.name,
      type: a.type,
      resolvedType: { kind: a.resolvedType.kind, ref: a.resolvedType.ref },
      fieldRole: a.fieldRole ?? 'field',
      required: a.required,
      primary: a.primary,
    })),
    relationships: e.relationships.map((r) => ({
      name: r.name,
      target: r.target,
      resolvedTarget: {
        kind: r.resolvedTarget.kind,
        ref: r.resolvedTarget.ref,
      },
      type: r.type,
    })),
    useCases: e.useCases.map((uc) => ({
      name: uc.name,
      methodName: uc.methodName,
      httpMethod: uc.httpMethod,
      category: uc.category,
      pathSuffix: uc.pathSuffix,
      requiresComment: uc.requiresComment,
      requiresUser: uc.requiresUser,
      stateMutation: uc.stateMutation,
    })),
  };
}

function enumToSnapshot(e: ResolvedEnum): EnumSnapshot {
  return {
    name: e.name,
    valueCount: e.values.length,
    values: e.values.map((v) => ({ name: v.name, label: v.label })),
  };
}

function workflowToSnapshot(wf: ResolvedWorkflow): WorkflowSnapshot {
  return {
    name: wf.name,
    participantCount: wf.participants.length,
    stepCount: wf.steps.length,
    startStep: wf.startStep,
    endSteps: wf.endSteps,
  };
}

function eventToSnapshot(ev: ResolvedEvent): EventSnapshot {
  return {
    name: ev.name,
    source: ev.source,
    payloadFieldCount: ev.payload.length,
    handlerCount: ev.handlers.length,
  };
}

function decisionToSnapshot(dc: ResolvedDecision): DecisionSnapshot {
  return {
    name: dc.name,
    input: dc.input,
    caseCount: dc.cases.length,
  };
}
