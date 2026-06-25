// ir/snapshot.ts — Serialize IR to JSON for observability
// Produces the format defined in docs/ir/ir-snapshot-format.md

import type { IR, EntityDef, EnumDef } from './types.js';

export interface IRSnapshot {
  meta: {
    tool: 'yaml2code-ir';
    version: 1;
    timestamp: string;
    specPath: string;
    /** SHA of the semantic model snapshot used as input */
    semanticHash: string;
  };
  summary: {
    entities: number;
    enums: number;
    attributes: number;
    relationships: number;
    useCases: number;
    workflows: number;
    events: number;
    decisions: number;
    flags: IRSnapshotFlags;
  };
  /** Selective entity fields for golden master comparison */
  entities: EntitySummary[];
  enums: EnumSummary[];
  /** Full IR when detailed mode is requested */
  ir?: IR;
}

export interface IRSnapshotFlags {
  hasStateMachine: boolean;
  hasEvents: boolean;
  hasWorkflows: boolean;
  hasDecisions: boolean;
  hasValidation: boolean;
  hasRules: boolean;
}

export interface EntitySummary {
  name: string;
  nameCamel: string;
  table: string;
  stereotype: string;
  attributeCount: number;
  attributeNames: string[];
  attributeFieldRoles: Record<string, string | undefined>;
  relationshipCount: number;
  relationships: { name: string; type: string; target: string }[];
  useCaseCount: number;
  useCaseNames: string[];
  useCaseCategories: Record<string, string | undefined>;
  flags: {
    hasCreate: boolean;
    hasUpdate: boolean;
    hasDelete: boolean;
    hasGetAll: boolean;
    hasGetById: boolean;
  };
  pkType?: string;
  transitionKeys?: string[];
  ruleNames?: string[];
  eventNames?: string[];
}

export interface EnumSummary {
  name: string;
  nameCamel: string;
  values: { name: string; label: string }[];
}

export function toIRSnapshot(
  ir: IR,
  specPath: string,
  semanticHash: string,
  includeFullIR?: boolean,
): IRSnapshot {
  const totalAttributes = ir.entities.reduce((s, e) => s + e.attributes.length, 0);
  const totalRelationships = ir.entities.reduce((s, e) => s + e.relationships.length, 0);
  const totalUseCases = ir.entities.reduce((s, e) => s + e.useCases.length, 0);

  const snapshot: IRSnapshot = {
    meta: {
      tool: 'yaml2code-ir',
      version: 1,
      timestamp: new Date().toISOString(),
      specPath,
      semanticHash,
    },
    summary: {
      entities: ir.entities.length,
      enums: ir.enums.length,
      attributes: totalAttributes,
      relationships: totalRelationships,
      useCases: totalUseCases,
      workflows: ir.workflows?.length ?? 0,
      events: ir.events?.length ?? 0,
      decisions: ir.decisions?.length ?? 0,
      flags: {
        hasStateMachine: ir.buildFeatures?.hasStateMachine ?? false,
        hasEvents: ir.buildFeatures?.hasEvents ?? false,
        hasWorkflows: ir.buildFeatures?.hasWorkflows ?? false,
        hasDecisions: ir.buildFeatures?.hasDecisions ?? false,
        hasValidation: ir.buildFeatures?.hasValidation ?? false,
        hasRules: ir.buildFeatures?.hasRules ?? false,
      },
    },
    entities: ir.entities.map(summarizeEntity),
    enums: ir.enums.map(summarizeEnum),
  };

  if (includeFullIR) {
    snapshot.ir = ir;
  }

  return snapshot;
}

function summarizeEntity(entity: EntityDef): EntitySummary {
  return {
    name: entity.name,
    nameCamel: entity.nameCamel,
    table: entity.table,
    stereotype: entity.stereotype,
    attributeCount: entity.attributes.length,
    attributeNames: entity.attributes.map((a) => a.name).sort(),
    attributeFieldRoles: Object.fromEntries(
      entity.attributes
        .map((a) => {
          const name = a.name.toLowerCase();
          let role: string | undefined;
          if (name === 'status') role = 'status';
          else if (name === 'priority') role = 'priority';
          else if (name.endsWith('id') && name !== 'id') role = 'assignee';
          else if (['createdat', 'updatedat'].includes(name)) role = 'timestamp';
          return [a.name, role];
        })
        .filter(([_, v]) => v),
    ),
    relationshipCount: entity.relationships.length,
    relationships: entity.relationships.map((r) => ({
      name: r.name,
      type: r.type,
      target: r.target,
    })),
    useCaseCount: entity.useCases.length,
    useCaseNames: entity.useCases.map((u) => u.name).sort(),
    useCaseCategories: Object.fromEntries(
      entity.useCases.filter((u) => u.category).map((u) => [u.name, u.category]),
    ),
    flags: {
      hasCreate: entity.useCases.some((uc) => uc.name === 'create'),
      hasUpdate: entity.useCases.some((uc) =>
        ['update', 'update_status', 'update_priority'].includes(uc.name),
      ),
      hasDelete: entity.useCases.some((uc) => uc.name === 'delete'),
      hasGetAll: entity.useCases.some((uc) => uc.name === 'get_all' || uc.name === 'load_users'),
      hasGetById: entity.useCases.some((uc) => uc.name === 'get_by_id'),
    },
    pkType: entity.primaryKey?.type,
    transitionKeys: entity.transitions ? Object.keys(entity.transitions) : undefined,
    ruleNames: entity.entityRules?.map((r) => r.name).sort(),
    eventNames: entity.entityEvents?.map((e) => e.name).sort(),
  };
}

function summarizeEnum(enm: EnumDef): EnumSummary {
  return {
    name: enm.name,
    nameCamel: enm.nameCamel,
    values: enm.values,
  };
}

export function compareIRSnapshots(
  baseline: IRSnapshot,
  current: IRSnapshot,
): { match: boolean; diffs: string[] } {
  const diffs: string[] = [];

  if (baseline.summary.entities !== current.summary.entities) {
    diffs.push(`entities: ${baseline.summary.entities} → ${current.summary.entities}`);
  }
  if (baseline.summary.enums !== current.summary.enums) {
    diffs.push(`enums: ${baseline.summary.enums} → ${current.summary.enums}`);
  }
  if (baseline.summary.attributes !== current.summary.attributes) {
    diffs.push(`attributes: ${baseline.summary.attributes} → ${current.summary.attributes}`);
  }
  if (baseline.summary.relationships !== current.summary.relationships) {
    diffs.push(
      `relationships: ${baseline.summary.relationships} → ${current.summary.relationships}`,
    );
  }
  if (baseline.summary.useCases !== current.summary.useCases) {
    diffs.push(`useCases: ${baseline.summary.useCases} → ${current.summary.useCases}`);
  }

  for (const be of baseline.entities) {
    const ce = current.entities.find((e) => e.name === be.name);
    if (!ce) {
      diffs.push(`entity ${be.name}: removed`);
      continue;
    }
    if (be.attributeCount !== ce.attributeCount) {
      diffs.push(`entity ${be.name}.attributeCount: ${be.attributeCount} → ${ce.attributeCount}`);
    }
    if (be.relationshipCount !== ce.relationshipCount) {
      diffs.push(
        `entity ${be.name}.relationshipCount: ${be.relationshipCount} → ${ce.relationshipCount}`,
      );
    }
    if (be.useCaseCount !== ce.useCaseCount) {
      diffs.push(`entity ${be.name}.useCaseCount: ${be.useCaseCount} → ${ce.useCaseCount}`);
    }
    const bUc = be.useCaseNames.sort().join(',');
    const cUc = ce.useCaseNames.sort().join(',');
    if (bUc !== cUc) {
      diffs.push(`entity ${be.name}.useCases: [${bUc}] → [${cUc}]`);
    }
  }
  for (const ce of current.entities) {
    if (!baseline.entities.find((e) => e.name === ce.name)) {
      diffs.push(`entity ${ce.name}: added`);
    }
  }

  return { match: diffs.length === 0, diffs };
}
