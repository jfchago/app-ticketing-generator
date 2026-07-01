// generation/vue/types.ts — Vue Generation Model types
// Projection of IR into Vue/TypeScript-specific rendering data.
// Templates consume this instead of computing from raw IR.

import type { GeneratedEntity, GeneratedEnum, GenerationModel } from '../common.js';

export interface VueGenerationModel extends GenerationModel {
  entities: { [name: string]: VueGeneratedEntity };
  enums: VueGeneratedEnum[];
}

export interface VueGeneratedEntity extends GeneratedEntity {
  /** Store state property name (e.g. 'tickets', 'items') */
  statePropertyName: string;
  /** Store selected item property name (e.g. 'selectedTicket', 'current') */
  selectedPropertyName: string;
  /** Fields to show in detail view (ordered) */
  displayFields: VueDisplayField[];
  /** Fields to show in create/edit form */
  formFields: VueFormField[];
  /** Component flags */
  components: VueComponentFlags;
  /** Resolved imports for this entity */
  imports: VueImports;
  /** Pre-computed use case data */
  useCases: { [name: string]: VueUseCaseDef };
  /** Pre-computed store actions */
  storeActions: VueStoreAction[];
  /** Pre-computed transition table */
  transitions: Record<string, string[]>;
  /** Pre-computed transition options expression for dropdown (template replaces {STATUS} with current status) */
  transitionOptionsExpr?: string;
  /** Pre-computed rule checks (guard expressions) */
  ruleChecks: VueRuleCheck[];
  /** Whether this entity has cross-entity comment support */
  hasCommentSupport: boolean;
  /** Comment entity ref if hasCommentSupport */
  commentEntity?: { namePascal: string; nameCamel: string };
  /** Whether this entity has activity logging support */
  hasActivityLog: boolean;
  /** ActivityLog entity ref if hasActivityLog */
  activityLogEntity?: { namePascal: string; nameCamel: string };
  /** Relation to User entity for assignee feature */
  hasAssignee: boolean;
  /** Enums referenced by this entity's attributes */
  enumAttributes: VueEnumAttribute[];
}

export interface VueDisplayField {
  name: string;
  namePascal: string;
  tsType: string;
  isEnum: boolean;
  fieldRole: string;
  /** Pre-computed expression for displaying the value with label fallback */
  labelExpr?: string;
}

export interface VueFormField {
  name: string;
  namePascal: string;
  tsType: string;
  isEnum: boolean;
  required: boolean;
  defaultValue: string | null;
  /** HTML input type: 'text', 'textarea', 'select', 'number' */
  inputType: string;
  /** Enum values for select inputs */
  enumValues?: VueEnumAttribute;
  /** Length for display */
  length?: number;
}

export interface VueEnumAttribute {
  name: string;
  namePascal: string;
  type: string;
  values: { name: string; label: string }[];
  labelsConstant: string;
}

export interface VueComponentFlags {
  shouldRenderCard: boolean;
  shouldRenderForm: boolean;
  shouldRenderStatusBadge: boolean;
  shouldRenderPriorityBadge: boolean;
  shouldRenderAssigneeBadge: boolean;
  hasAnyBadgeField: boolean;
  hasTimestampField: boolean;
}

export interface VueImports {
  domain: string[];
  infrastructure: string[];
  components: string[];
  stores: string[];
}

export interface VueUseCaseDef {
  name: string;
  methodName: string;
  httpMethod: string;
  /** API call definition */
  apiCall: {
    path: string;
    hasBody: boolean;
    bodyType: string;
    responseType: string;
  };
  /** Store action definition */
  storeAction: {
    actionName: string;
    paramNames: string[];
    paramTypes: string[];
    routeAfter?: string;
    ruleChecks: VueRuleCheck[];
  };
  /** Repository/service method signature */
  methodSignature: {
    params: string;
    returnType: string;
  };
  /** Action category: read, readById, create, updateStatus, updatePriority, assign, unassign, comment, default */
  actionCategory: string;
  /** Whether this use case requires an ID parameter */
  needsId: boolean;
  /** Response type (entity name or entity name[]) */
  returnType: string;
}

export interface VueStoreAction {
  name: string;
  params: { name: string; type: string }[];
  body: string;
  hasRuleChecks: boolean;
  actionCategory: string;
}

export interface VueRuleCheck {
  nameCamel: string;
  namePascal: string;
  guardExpression: string;
  message: string;
  on: string;
}

export interface VueGeneratedEnum extends GeneratedEnum {
  values: { name: string; label: string }[];
}
