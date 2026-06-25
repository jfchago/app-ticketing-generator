// semantic/resolver.ts — Symbol and reference resolution
// Converts ValidatedSpec fields into Resolved* types with:
// - type resolution (primitive/enum/entity/unknown)
// - reference resolution (relationship targets, use cases)
// - field role assignment
// - use case categorization
// - entity flag computation

import type {
  ValidatedSpec,
  ValidatedEntity,
  ValidatedAttribute,
  ValidatedRelationship,
  ValidatedEnum,
} from "../validator/schema-validator.js";
import type { BehaviorAST } from "../lang/ast-types.js";
import type {
  ResolvedDomain,
  ResolvedEntity,
  ResolvedAttribute,
  ResolvedType,
  ResolvedRelationship,
  ResolvedTarget,
  ResolvedUseCase,
  ResolvedRule,
  ResolvedEnum,
  ResolvedAppInfo,
  BuildFeatures,
  ResolvedWorkflow,
  ResolvedEvent,
  ResolvedDecision,
  UseCaseCategory,
} from "./types.js";
import { PRIMITIVE_TYPES } from "../ir/builder.js";
import { resolveUseCase, isKnownUseCase } from "../ir/use-case-resolver.js";
import type { SemanticDiagnostic } from "./diagnostics.js";
import { error, warning } from "./diagnostics.js";

export function resolveDomain(
  spec: ValidatedSpec,
  behaviorASTs?: BehaviorAST[],
): { domain: ResolvedDomain; diagnostics: SemanticDiagnostic[] } {
  const diagnostics: SemanticDiagnostic[] = [];

  const appInfo = resolveAppInfo(spec);

  const entityNames = new Set(spec.entities.map((e) => e.name));
  const enumNames = new Set(Object.keys(spec.enums ?? {}));

  const enums = resolveEnums(spec.enums ?? {});

  const entities = spec.entities.map((e) =>
    resolveEntity(e, entityNames, enumNames, diagnostics),
  );

  const workflows: ResolvedWorkflow[] = [];
  const events: ResolvedEvent[] = [];
  const decisions: ResolvedDecision[] = [];

  if (behaviorASTs) {
    for (const ast of behaviorASTs) {
      switch (ast.kind) {
        case "Workflow":
          workflows.push(resolveWorkflow(ast));
          break;
        case "Event":
          events.push(resolveEvent(ast, entityNames, diagnostics));
          break;
        case "Decision":
          decisions.push(resolveDecision(ast, entityNames, diagnostics));
          break;
      }
    }
  }

  const buildFeatures = computeBuildFeatures(
    entities,
    workflows,
    events,
    decisions,
  );

  return {
    domain: {
      application: appInfo,
      enums,
      entities,
      workflows,
      events,
      decisions,
      buildFeatures,
    },
    diagnostics,
  };
}

function resolveAppInfo(spec: ValidatedSpec): ResolvedAppInfo {
  return {
    name: spec.application.name,
    module: spec.application.module,
    description: spec.application.description,
    basePackage:
      spec.application.basePackage ?? `com.${spec.application.module}`,
    appClassName: spec.application.name.replace(/[^a-zA-Z0-9]+/g, ""),
  };
}

function resolveEnums(enums: Record<string, ValidatedEnum>): ResolvedEnum[] {
  return Object.entries(enums).map(([name, def]) => ({
    name,
    namePascal: name,
    nameCamel: camelCase(name),
    values: def.values.map((v) => ({
      name: v,
      label: (def.labels as Record<string, string>)?.[v] ?? v,
    })),
  }));
}

function resolveEntity(
  raw: ValidatedEntity,
  entityNames: Set<string>,
  enumNames: Set<string>,
  diagnostics: SemanticDiagnostic[],
): ResolvedEntity {
  const useCases = resolveUseCases(raw.use_cases ?? [], diagnostics, raw.name);
  const attributes = resolveAttributes(
    raw.attributes,
    entityNames,
    enumNames,
    raw.name,
    diagnostics,
  );
  const relationships = resolveRelationships(
    raw.relationships ?? [],
    entityNames,
    diagnostics,
    raw.name,
  );
  const primaryKey = attributes.find((a) => a.primary) ?? null;
  const entityRules = resolveRules((raw as any).rules ?? [], raw.name);
  const transitions = (raw as any).transitions;

  const hasCreate = useCases.some((uc) => uc.category === "create");
  const hasUpdate = useCases.some((uc) => uc.category === "update");
  const hasDelete = useCases.some((uc) => uc.category === "delete");
  const hasGetAll = useCases.some(
    (uc) => uc.category === "read" && !uc.needsId,
  );
  const hasGetById = useCases.some(
    (uc) => uc.category === "read" && uc.needsId,
  );

  const hasComments = useCases.some((uc) => uc.requiresComment);
  const relatedEntities = relationships.map((r) => r.target);

  return {
    name: raw.name,
    nameCamel: camelCase(raw.name),
    namePascal: raw.name,
    nameKebab: kebabCase(raw.name),
    nameSnake: snakeCase(raw.name),
    table: raw.table ?? raw.name.toLowerCase(),
    description: raw.description ?? "",
    stereotype: raw.stereotype ?? "entity",
    attributes,
    relationships,
    useCases,
    primaryKey,
    transitions,
    entityRules,
    entityEvents: [],
    hasCreate,
    hasUpdate,
    hasDelete,
    hasGetAll,
    hasGetById,
    hasComments,
    relatedEntities,
    commentEntity: null,
    statePropertyName: camelCase(raw.name) + "s",
  };
}

function resolveAttributes(
  rawAttrs: ValidatedAttribute[],
  entityNames: Set<string>,
  enumNames: Set<string>,
  entityName: string,
  diagnostics: SemanticDiagnostic[],
): ResolvedAttribute[] {
  return rawAttrs.map((attr) => {
    const resolvedType = resolveAttributeType(
      attr.type,
      entityNames,
      enumNames,
      entityName,
      attr.name,
      diagnostics,
    );
    const isCamel = attr.name !== camelCase(attr.name);

    return {
      name: attr.name,
      namePascal: isCamel ? pascalCase(attr.name) : capitalize(attr.name),
      type: attr.type,
      resolvedType,
      required: attr.required ?? false,
      primary: attr.primary ?? false,
      defaultValue:
        attr.default !== undefined ? String(attr.default) : undefined,
      length: attr.length,
      column: attr.column ?? attr.name,
      nullable: !(attr.required ?? false),
      unique: attr.unique ?? false,
      fieldRole: undefined,
      tsType: mapToTSType(
        attr.type,
        attr.required ?? false,
        resolvedType.kind === "enum",
        resolvedType.kind === "entity",
      ),
    };
  });
}

function resolveAttributeType(
  type: string,
  entityNames: Set<string>,
  enumNames: Set<string>,
  entityName: string,
  attrName: string,
  diagnostics: SemanticDiagnostic[],
): ResolvedType {
  if (PRIMITIVE_TYPES.has(type)) return { kind: "primitive", ref: type };
  if (enumNames.has(type)) return { kind: "enum", ref: type };
  if (entityNames.has(type)) return { kind: "entity", ref: type };

  diagnostics.push(
    error(
      "SEM-001",
      `Attribute "${attrName}" in entity "${entityName}" has unknown type "${type}". Must be a primitive, known enum, or known entity.`,
      { kind: "attribute", name: attrName, parent: entityName },
    ),
  );
  return { kind: "unknown", ref: type };
}

function resolveRelationships(
  rawRels: ValidatedRelationship[],
  entityNames: Set<string>,
  diagnostics: SemanticDiagnostic[],
  entityName: string,
): ResolvedRelationship[] {
  return rawRels.map((rel) => {
    const resolved: ResolvedTarget = entityNames.has(rel.target)
      ? { kind: "resolved", ref: rel.target }
      : { kind: "unresolved", ref: rel.target };

    if (resolved.kind === "unresolved") {
      diagnostics.push(
        error(
          "SEM-101",
          `Relationship "${rel.name}" in entity "${entityName}" targets unknown entity "${rel.target}"`,
          { kind: "relationship", name: rel.name, parent: entityName },
          { kind: "entity", name: rel.target },
        ),
      );
    }

    return {
      name: rel.name,
      namePascal: pascalCase(rel.name),
      type: rel.type,
      target: rel.target,
      targetPascal: rel.target,
      foreignKey: rel.foreign_key,
      sourceCardinality:
        rel.source_cardinality !== undefined
          ? String(rel.source_cardinality)
          : "0..*",
      targetCardinality:
        rel.target_cardinality !== undefined
          ? String(rel.target_cardinality)
          : "1",
      resolvedTarget: resolved,
    };
  });
}

function resolveUseCases(
  rawUseCases: string[],
  diagnostics: SemanticDiagnostic[],
  entityName: string,
): ResolvedUseCase[] {
  return rawUseCases.map((uc) => {
    const known = isKnownUseCase(uc);
    if (!known) {
      diagnostics.push(
        error(
          "SEM-102",
          `Unknown use case "${uc}" in entity "${entityName}" — using defaults`,
          { kind: "use_case", name: uc, parent: entityName },
        ),
      );
    }
    const resolved = resolveUseCase(uc);
    return {
      name: resolved.name,
      methodName: resolved.methodName,
      httpMethod: resolved.httpMethod,
      needsPayload: resolved.needsPayload,
      needsId: resolved.needsId,
      pathSuffix: resolved.pathSuffix,
      actionLabel: resolved.actionLabel,
      category: computeUseCaseCategory(resolved.name, resolved.httpMethod),
      requiresComment: resolved.name === "add_comment",
      requiresUser: ["assign_user", "unassign_user", "load_users"].includes(
        resolved.name,
      ),
      stateMutation: ["update_status", "update_priority"].includes(
        resolved.name,
      ),
      resolved: known,
    };
  });
}

function computeUseCaseCategory(
  name: string,
  httpMethod: string,
): UseCaseCategory {
  if (name === "create") return "create";
  if (httpMethod === "DELETE") return "delete";
  if (httpMethod === "GET") return "read";
  if (["update", "update_status", "update_priority"].includes(name))
    return "update";
  return "action";
}

function resolveRules(rawRules: any[], _entityName: string): ResolvedRule[] {
  return (rawRules ?? []).map((r: any) => ({
    name: r.name,
    namePascal: pascalCase(r.name),
    nameCamel: camelCase(r.name),
    on: r.on,
    guard: r.guard,
    message: r.message,
  }));
}

function computeBuildFeatures(
  entities: ResolvedEntity[],
  workflows: ResolvedWorkflow[],
  events: ResolvedEvent[],
  decisions: ResolvedDecision[],
): BuildFeatures {
  return {
    hasStateMachine: entities.some(
      (e) => e.transitions && Object.keys(e.transitions).length > 0,
    ),
    hasEvents:
      events.length > 0 || entities.some((e) => e.entityEvents.length > 0),
    hasWorkflows: workflows.length > 0,
    hasDecisions: decisions.length > 0,
    hasValidation: entities.some((e) => e.entityRules.length > 0),
    hasRules: entities.some((e) => e.entityRules.length > 0),
  };
}

function resolveWorkflow(
  ast: BehaviorAST & { kind: "Workflow" },
): ResolvedWorkflow {
  return {
    name: ast.name,
    namePascal: pascalCase(ast.name),
    nameCamel: camelCase(ast.name),
    participants: ast.participants.map((p) => ({ role: p.role, name: p.name })),
    steps: ast.steps.map((s) => ({
      id: s.id,
      name: s.name,
      label: s.label,
      type: s.type,
      actorName: s.actorName,
      actions: s.actions.map((a) => ({
        type: a.type,
        target: a.target,
        params: a.params,
        resultVariable: a.resultVariable,
      })),
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
    })),
    startStep: ast.startStep,
    endSteps: ast.endSteps,
  };
}

function resolveEvent(
  ast: BehaviorAST & { kind: "Event" },
  entityNames: Set<string>,
  diagnostics: SemanticDiagnostic[],
): ResolvedEvent {
  const resolvedSource = ast.source
    ? entityNames.has(ast.source)
      ? ("entity" as const)
      : ("unresolved" as const)
    : undefined;

  if (ast.source && resolvedSource === "unresolved") {
    diagnostics.push(
      warning(
        "SEM-401",
        `Event "${ast.name}" source "${ast.source}" is not a known entity`,
        { kind: "event", name: ast.name },
        { kind: "entity", name: ast.source },
      ),
    );
  }

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
    resolvedSource,
  };
}

function resolveDecision(
  ast: BehaviorAST & { kind: "Decision" },
  entityNames: Set<string>,
  diagnostics: SemanticDiagnostic[],
): ResolvedDecision {
  if (ast.input && !entityNames.has(ast.input)) {
    diagnostics.push(
      warning(
        "SEM-402",
        `Decision "${ast.name}" input "${ast.input}" is not a known entity`,
        { kind: "decision", name: ast.name },
        { kind: "entity", name: ast.input },
      ),
    );
  }

  return {
    name: ast.name,
    namePascal: pascalCase(ast.name),
    nameCamel: camelCase(ast.name),
    input: ast.input,
    cases: ast.cases.map((c) => ({
      condition: c.condition,
      actions: c.actions.map((a) => ({
        type: a.type,
        target: a.target,
        params: a.params,
        resultVariable: a.resultVariable,
      })),
    })),
    defaultActions: ast.defaultActions.map((a) => ({
      type: a.type,
      target: a.target,
      params: a.params,
      resultVariable: a.resultVariable,
    })),
  };
}

function mapToTSType(
  type: string,
  required: boolean,
  isEnum: boolean,
  isEntityRef: boolean,
): string {
  const primitiveMap: Record<string, string> = {
    String: "string",
    Integer: "number",
    Long: "number",
    Float: "number",
    Double: "number",
    Boolean: "boolean",
    Date: "string",
    DateTime: "string",
    Timestamp: "string",
  };
  let tsType: string;
  if (primitiveMap[type]) tsType = primitiveMap[type];
  else if (isEnum || isEntityRef) tsType = type;
  else tsType = "unknown";
  if (!required) tsType = `${tsType} | null`;
  return tsType;
}

function camelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}
function pascalCase(str: string): string {
  if (!/[-_\s]/.test(str)) return str.charAt(0).toUpperCase() + str.slice(1);
  return str
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}
function snakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}
