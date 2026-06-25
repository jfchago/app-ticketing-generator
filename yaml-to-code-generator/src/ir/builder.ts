// ir/builder.ts — Converts validated YAML spec into the normalized IR
// This is the bridge between raw parsed YAML and the code that templates consume.

import type {
  IR,
  AppInfo,
  EnumDef,
  EnumValueDef,
  EntityDef,
  AttributeDef,
  RelationshipDef,
  RelationType,
  ActionDef,
  ActionType,
  WorkflowDef,
  WorkflowStepDef,
  ParticipantDef,
  EventDef,
  DecisionDef,
} from './types.js';
import { resolveUseCase } from './use-case-resolver.js';
import type { ValidatedSpec, ValidatedEntity, ValidatedAttribute, ValidatedRelationship, ValidatedEnum } from '../validator/schema-validator.js';
import type {
  BehaviorAST,
  WorkflowAST,
  WorkflowStepAST as ASTWorkflowStep,
  EventAST,
  DecisionAST,
  ActionAST,
  ParticipantAST,
} from '../lang/ast-types.js';
import type { SemanticModel, ResolvedEntity } from '../semantic/types.js';

const PRIMITIVE_TYPES = new Set(['String', 'Integer', 'Long', 'Float', 'Double', 'Boolean', 'Date', 'DateTime', 'Timestamp']);
const DB_TYPE_MAP: Record<string, string> = {
  String: 'VARCHAR',
  Integer: 'INTEGER',
  Long: 'BIGINT',
  Float: 'FLOAT',
  Double: 'DOUBLE',
  Boolean: 'BOOLEAN',
  Date: 'DATE',
  DateTime: 'TIMESTAMP',
  Timestamp: 'TIMESTAMP',
};

function buildAppInfo(spec: ValidatedSpec): AppInfo {
  const name = spec.application.name;
  return {
    name,
    module: spec.application.module,
    description: spec.application.description,
    basePackage: spec.application.basePackage ?? `com.${spec.application.module}`,
    appClassName: name.replace(/[^a-zA-Z0-9]+/g, ''),
  };
}

function buildEnums(enums: Record<string, ValidatedEnum>): EnumDef[] {
  return Object.entries(enums).map(([name, def]) => ({
    name,
    namePascal: name,
    nameCamel: camelCase(name),
    values: buildEnumValues(def),
  }));
}

function buildEnumValues(def: ValidatedEnum): EnumValueDef[] {
  return def.values.map((value) => ({
    name: value,
    label: (def.labels as Record<string, string>)?.[value] ?? value,
  }));
}

function buildEntity(
  raw: ValidatedEntity,
  entityNames: Set<string>,
  enumNames: Set<string>,
): EntityDef {
  const useCases = (raw.use_cases ?? []).map((uc) => resolveUseCase(uc));
  const attributes = buildAttributes(raw.attributes, entityNames, enumNames);
  const relationships = buildRelationships(raw.relationships ?? []);
  const primaryKey = attributes.find((a) => a.primary);

  return {
    name: raw.name,
    nameCamel: camelCase(raw.name),
    namePascal: raw.name,
    nameKebab: kebabCase(raw.name),
    nameSnake: snakeCase(raw.name),
    table: raw.table ?? raw.name.toLowerCase(),
    description: raw.description ?? '',
    stereotype: raw.stereotype ?? 'entity',
    attributes,
    relationships,
    useCases,
    hasCreate: useCases.some((uc) => uc.name === 'create'),
    hasUpdate: useCases.some((uc) => ['update', 'update_status', 'update_priority'].includes(uc.name)),
    hasDelete: useCases.some((uc) => uc.name === 'delete'),
    hasGetAll: useCases.some((uc) => uc.name === 'get_all' || uc.name === 'load_users'),
    hasGetById: useCases.some((uc) => uc.name === 'get_by_id'),
    primaryKey,
    transitions: (raw as any).transitions,
    entityRules: ((raw as any).rules ?? []).map((r: any) => ({
      name: r.name,
      namePascal: pascalCase(r.name),
      nameCamel: camelCase(r.name),
      on: r.on,
      guard: r.guard,
      message: r.message,
    })),
  };
}

function buildAttributes(
  rawAttrs: ValidatedAttribute[],
  entityNames: Set<string>,
  enumNames: Set<string>,
): AttributeDef[] {
  return rawAttrs.map((attr) => {
    const isPrimitive = PRIMITIVE_TYPES.has(attr.type);
    const isEnum = enumNames.has(attr.type);
    const isEntityRef = entityNames.has(attr.type);
    const isCamel = attr.name !== camelCase(attr.name);

    return {
      name: attr.name,
      namePascal: isCamel ? pascalCase(attr.name) : capitalize(attr.name),
      type: attr.type,
      tsType: mapToTSType(attr.type, attr.required, isEnum, isEntityRef),
      required: attr.required ?? false,
      primary: attr.primary ?? false,
      defaultValue: attr.default !== undefined ? String(attr.default) : undefined,
      isEnum,
      isEntityRef,
      isPrimitive,
      length: attr.length,
      column: attr.column ?? attr.name,
      nullable: !(attr.required ?? false),
      unique: attr.unique ?? false,
    };
  });
}

function buildRelationships(rawRels: ValidatedRelationship[]): RelationshipDef[] {
  return rawRels.map((rel) => ({
    name: rel.name,
    namePascal: pascalCase(rel.name),
    type: rel.type as RelationType,
    target: rel.target,
    targetPascal: rel.target,
    foreignKey: rel.foreign_key,
    sourceCardinality: rel.source_cardinality !== undefined ? String(rel.source_cardinality) : '0..*',
    targetCardinality: rel.target_cardinality !== undefined ? String(rel.target_cardinality) : '1',
  }));
}

function mapToTSType(
  type: string,
  required: boolean,
  isEnum: boolean,
  isEntityRef: boolean,
): string {
  const primitiveMap: Record<string, string> = {
    String: 'string',
    Integer: 'number',
    Long: 'number',
    Float: 'number',
    Double: 'number',
    Boolean: 'boolean',
    Date: 'string',
    DateTime: 'string',
    Timestamp: 'string',
  };

  // eslint-ignore-line
  let tsType: string;
  if (primitiveMap[type]) {
    tsType = primitiveMap[type];
  } else if (isEnum || isEntityRef) {
    tsType = type;
  } else {
    tsType = 'unknown';
  }

  if (!required) {
    tsType = `${tsType} | null`;
  }
  return tsType;
}

function camelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function pascalCase(str: string): string {
  // No delimiters → already camel/PascalCase, just capitalize first letter
  if (!/[-_\s]/.test(str)) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  return str
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function snakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

// ── Behavioral IR Builder (v2) ───────────────────────────────────────

export interface BehaviorIRContext {
  /** Map from behavior block name to the entity name it belongs to */
  entityMap?: Map<string, string>;
}

/**
 * Merges behavior ASTs into the structural IR.
 * - State machines with entity association → entity.stateMachine
 * - Entity-scoped rules → entity.entityRules
 * - Top-level workflows, events, decisions, rules → IR root arrays
 */
export function extendIRWithBehavior(
  ir: IR,
  asts: BehaviorAST[],
  context?: BehaviorIRContext,
): IR {
  const entityMap = context?.entityMap ?? new Map<string, string>();
  const entityByName = new Map(ir.entities.map((e) => [e.name, e]));

  const workflows: WorkflowDef[] = [];
  const topEvents: EventDef[] = [];
  const topDecisions: DecisionDef[] = [];

  for (const ast of asts) {
    switch (ast.kind) {
      case 'Workflow':
        workflows.push(workflowASTToIR(ast));
        break;
      case 'Event': {
        const ev = eventASTToIR(ast);
        const entityName = entityMap.get(ast.name);
        if (entityName && entityByName.has(entityName)) {
          const entity = entityByName.get(entityName)!;
          entity.entityEvents = entity.entityEvents ?? [];
          entity.entityEvents.push(ev);
        } else {
          topEvents.push(ev);
        }
        break;
      }
      case 'Decision':
        topDecisions.push(decisionASTToIR(ast));
        break;
    }
  }

  if (workflows.length > 0) ir.workflows = workflows;
  if (topEvents.length > 0) ir.events = topEvents;
  if (topDecisions.length > 0) ir.decisions = topDecisions;

  return ir;
}

// ── AST → IR mapping functions ──────────────────────────────────────

function actionASTToIR(a: ActionAST): ActionDef {
  return {
    type: a.type as ActionType,
    target: a.target,
    params: a.params,
    resultVariable: a.resultVariable,
  };
}

function participantASTToIR(p: ParticipantAST): ParticipantDef {
  return {
    role: p.role,
    name: p.name,
  };
}
function workflowASTToIR(ast: WorkflowAST): WorkflowDef {
  return {
    name: ast.name,
    namePascal: pascalCase(ast.name),
    nameCamel: camelCase(ast.name),
    participants: ast.participants.map(participantASTToIR),
    steps: ast.steps.map(workflowStepASTToIR),
    startStep: ast.startStep,
    endSteps: ast.endSteps,
  };
}

function workflowStepASTToIR(s: ASTWorkflowStep): WorkflowStepDef {
  return {
    id: s.id,
    name: s.name,
    label: s.label,
    type: s.type,
    actorName: s.actorName,
    actions: s.actions.map(actionASTToIR),
    transitions: s.transitions.map((t) => ({
      targetStep: t.targetStep,
      condition: t.condition,
      label: t.label,
      isDefault: t.isDefault,
    })),
    timerExpression: s.timerExpression,
    errorHandlers: s.errorHandlers.map((e) => ({
      errorType: e.errorType,
      targetStep: e.targetStep,
    })),
    deadline: s.deadline,
    escalation: s.escalation,
  };
}

function eventASTToIR(ast: EventAST): EventDef {
  return {
    name: ast.name,
    namePascal: pascalCase(ast.name),
    nameCamel: camelCase(ast.name),
    source: ast.source,
    payload: ast.payload.map((f) => ({
      name: f.name,
      type: f.type,
      required: f.required,
    })),
    handlers: ast.handlers,
  };
}

function decisionASTToIR(ast: DecisionAST): DecisionDef {
  return {
    name: ast.name,
    namePascal: pascalCase(ast.name),
    nameCamel: camelCase(ast.name),
    input: ast.input,
    cases: ast.cases.map((c) => ({
      condition: c.condition,
      actions: c.actions.map(actionASTToIR),
    })),
    defaultActions: ast.defaultActions.map(actionASTToIR),
  };
}

export { DB_TYPE_MAP, PRIMITIVE_TYPES };

export function buildIR(model: SemanticModel): IR {
  const domain = model.domain;

  return {
    application: buildAppInfoFromSemantic(domain),
    enums: domain.enums.map(e => ({
      name: e.name,
      namePascal: e.namePascal,
      nameCamel: e.nameCamel,
      values: e.values.map(v => ({ name: v.name, label: v.label })),
    })),
    entities: domain.entities.map(e => buildEntityFromSemantic(e)),
    buildFeatures: {
      hasStateMachine: domain.buildFeatures.hasStateMachine,
      hasEvents: domain.buildFeatures.hasEvents,
      hasWorkflows: domain.buildFeatures.hasWorkflows,
      hasDecisions: domain.buildFeatures.hasDecisions,
      hasValidation: domain.buildFeatures.hasValidation,
      hasRules: domain.buildFeatures.hasRules,
    },
    workflows: domain.workflows.length > 0 ? domain.workflows.map(w => ({
      name: w.name,
      namePascal: w.namePascal,
      nameCamel: w.nameCamel,
      participants: w.participants.map(p => ({ role: p.role as any, name: p.name })),
      steps: w.steps.map(s => ({
        id: s.id,
        name: s.name,
        label: s.label,
        type: s.type as any,
        actorName: s.actorName,
        actions: s.actions.map(a => ({
          type: a.type as ActionType,
          target: a.target,
          params: a.params as Record<string, string>,
          resultVariable: a.resultVariable,
        })),
        transitions: s.transitions.map(t => ({
          targetStep: t.targetStep,
          condition: t.condition,
          label: t.label,
          isDefault: t.isDefault,
        })),
        timerExpression: s.timerExpression,
        errorHandlers: s.errorHandlers.map(h => ({
          errorType: h.errorType,
          targetStep: h.targetStep,
        })),
        deadline: s.deadline,
        escalation: s.escalation,
      })),
      startStep: w.startStep,
      endSteps: w.endSteps,
    })) : undefined,
    events: domain.events.length > 0 ? domain.events.map(ev => ({
      name: ev.name,
      namePascal: ev.namePascal,
      nameCamel: ev.nameCamel,
      source: ev.source,
      payload: ev.payload.map(f => ({ name: f.name, type: f.type, required: f.required })),
      handlers: ev.handlers,
    })) : undefined,
    decisions: domain.decisions.length > 0 ? domain.decisions.map(dc => ({
      name: dc.name,
      namePascal: dc.namePascal,
      nameCamel: dc.nameCamel,
      input: dc.input,
      cases: dc.cases.map(c => ({
        condition: c.condition,
        actions: c.actions.map(a => ({
          type: a.type as ActionType,
          target: a.target,
          params: a.params as Record<string, string>,
          resultVariable: a.resultVariable,
        })),
      })),
      defaultActions: dc.defaultActions.map(a => ({
        type: a.type as ActionType,
        target: a.target,
        params: a.params as Record<string, string>,
        resultVariable: a.resultVariable,
      })),
    })) : undefined,
  };
}

function buildAppInfoFromSemantic(domain: any): AppInfo {
  return {
    name: domain.application.name,
    module: domain.application.module,
    description: domain.application.description,
    basePackage: domain.application.basePackage,
    appClassName: domain.application.appClassName,
  };
}

function buildEntityFromSemantic(e: ResolvedEntity): EntityDef {
  return {
    name: e.name,
    nameCamel: e.nameCamel,
    namePascal: e.namePascal,
    nameKebab: e.nameKebab,
    nameSnake: e.nameSnake,
    table: e.table,
    description: e.description,
    stereotype: e.stereotype,
    attributes: e.attributes.map(a => ({
      name: a.name,
      namePascal: a.namePascal,
      type: a.type,
      required: a.required,
      primary: a.primary,
      defaultValue: a.defaultValue,
      isEnum: a.resolvedType.kind === 'enum',
      isEntityRef: a.resolvedType.kind === 'entity',
      isPrimitive: a.resolvedType.kind === 'primitive',
      length: a.length,
      column: a.column,
      nullable: a.nullable,
      unique: a.unique,
      tsType: a.tsType,
    })),
    relationships: e.relationships.map(r => ({
      name: r.name,
      namePascal: r.namePascal,
      type: r.type as RelationType,
      target: r.target,
      targetPascal: r.targetPascal,
      foreignKey: r.foreignKey,
      sourceCardinality: r.sourceCardinality,
      targetCardinality: r.targetCardinality,
    })),
    useCases: e.useCases.map(uc => ({
      name: uc.name,
      methodName: uc.methodName,
      httpMethod: uc.httpMethod as any,
      category: uc.category,
      needsPayload: uc.needsPayload,
      needsId: uc.needsId,
      pathSuffix: uc.pathSuffix,
      actionLabel: uc.actionLabel,
    })),
    transitions: e.transitions,
    entityRules: e.entityRules.map(r => ({
      name: r.name,
      namePascal: r.namePascal,
      nameCamel: r.nameCamel,
      on: r.on,
      guard: r.guard,
      message: r.message,
    })),
    entityEvents: e.entityEvents.map(ev => ({
      name: ev.name,
      namePascal: ev.namePascal,
      nameCamel: ev.nameCamel,
      source: ev.source,
      payload: ev.payload,
      handlers: ev.handlers,
    })),
    primaryKey: e.primaryKey ? {
      name: e.primaryKey.name,
      namePascal: e.primaryKey.namePascal,
      type: e.primaryKey.type,
      required: e.primaryKey.required,
      primary: true,
      isEnum: false,
      isEntityRef: false,
      isPrimitive: e.primaryKey.resolvedType.kind === 'primitive',
      length: e.primaryKey.length,
      column: e.primaryKey.column,
      nullable: false,
      unique: false,
    } : undefined,
  };
}
