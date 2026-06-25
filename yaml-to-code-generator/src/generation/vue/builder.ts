// generation/vue/builder.ts — Builds Vue Generation Model from IR
// Pre-computes everything Vue templates currently compute at render time.

import type { IR, EntityDef, AttributeDef, UseCaseDef } from '../../ir/types.js';
import type {
  VueGenerationModel, VueGeneratedEntity, VueDisplayField, VueFormField,
  VueComponentFlags, VueUseCaseDef, VueStoreAction, VueRuleCheck,
  VueEnumAttribute,
} from './types.js';

export function buildVueGenerationModel(ir: IR): VueGenerationModel {
  const entities: Record<string, VueGeneratedEntity> = {};

  for (const entity of ir.entities) {
    entities[entity.name] = buildVueEntity(entity, ir);
  }

  return {
    ir,
    entities,
    enums: ir.enums.map(e => ({
      name: e.name,
      namePascal: e.namePascal,
      nameCamel: e.nameCamel,
      values: e.values,
    })),
    features: ir.buildFeatures,
  };
}

function buildVueEntity(entity: EntityDef, ir: IR): VueGeneratedEntity {
  const commentRel = findCommentRelationship(entity, ir);
  const hasCommentSupport = !!commentRel && entity.useCases.some(uc => uc.name === 'add_comment');
  const commentEntity = hasCommentSupport ? ir.entities.find(e => e.name === commentRel!.target) : undefined;

  const displayFields = buildDisplayFields(entity);
  const formFields = buildFormFields(entity);
  const components = buildComponentFlags(entity, ir, hasCommentSupport);
  const ruleChecks = buildRuleChecks(entity);
  const useCases = buildUseCases(entity, ir, commentEntity);
  const storeActions = deriveStoreActions(entity, useCases);

  return {
    name: entity.name,
    namePascal: entity.namePascal,
    nameCamel: entity.nameCamel,
    nameKebab: entity.nameKebab,
    stereotype: entity.stereotype,
    hasCreate: entity.useCases.some(uc => uc.name === 'create'),
    hasUpdate: entity.useCases.some(uc => ['update', 'update_status', 'update_priority'].includes(uc.name)),
    hasDelete: entity.useCases.some(uc => uc.name === 'delete'),
    hasGetAll: entity.useCases.some(uc => uc.name === 'get_all' || uc.name === 'load_users'),
    hasGetById: entity.useCases.some(uc => uc.name === 'get_by_id'),
    statePropertyName: entity.nameCamel + 's',
    selectedPropertyName: 'current',
    displayFields,
    formFields,
    components,
    imports: buildImports(entity, components, hasCommentSupport),
    useCases,
    storeActions,
    transitions: entity.transitions ?? {},
    ruleChecks,
    hasCommentSupport,
    commentEntity: commentEntity ? { namePascal: commentEntity.namePascal, nameCamel: commentEntity.nameCamel } : undefined,
    hasAssignee: entity.relationships.some(r => r.name === 'assignee'),
    enumAttributes: buildEnumAttributes(entity, ir),
  };
}

function findCommentRelationship(entity: EntityDef, ir: IR): { target: string; foreignKey: string } | undefined {
  const textEntityNames = new Set(
    ir.entities
      .filter(e => e.attributes.some(a => a.name === 'text' && a.type === 'String'))
      .map(e => e.name),
  );
  for (const rel of entity.relationships) {
    if (rel.type === 'one_to_many' && textEntityNames.has(rel.target)) {
      return { target: rel.target, foreignKey: rel.foreignKey };
    }
  }
  return undefined;
}

function mapToTSType(attr: AttributeDef): string {
  const primitiveMap: Record<string, string> = {
    String: 'string', Integer: 'number', Long: 'number',
    Float: 'number', Double: 'number', Boolean: 'boolean',
    Date: 'string', DateTime: 'string', Timestamp: 'string',
  };
  let tsType = primitiveMap[attr.type] ?? (attr.isEnum || attr.isEntityRef ? attr.type : 'unknown');
  if (!attr.required) tsType = `${tsType} | null`;
  return tsType;
}

function computeFieldRole(attr: AttributeDef): string {
  if (attr.primary) return 'id';
  const name = attr.name.toLowerCase();
  if (name === 'status') return 'status';
  if (name === 'priority') return 'priority';
  if (name.endsWith('id') && name !== 'id') return 'assignee';
  if (['createdat', 'updatedat', 'datetime', 'date', 'timestamp'].includes(name)) return 'timestamp';
  if (name === 'title' || name === 'description' || name === 'text') return 'text';
  return 'field';
}

function buildDisplayFields(entity: EntityDef): VueDisplayField[] {
  return entity.attributes
    .filter(a => !a.primary)
    .map(a => ({
      name: a.name,
      namePascal: a.namePascal,
      tsType: mapToTSType(a),
      isEnum: a.isEnum,
      fieldRole: computeFieldRole(a),
    }));
}

function buildFormFields(entity: EntityDef): VueFormField[] {
  const excludedNames = new Set(['id', 'createdAt', 'updatedAt']);

  return entity.attributes
    .filter(a => !a.primary && !excludedNames.has(a.name) && !a.isEntityRef)
    .map(a => ({
      name: a.name,
      namePascal: a.namePascal,
      tsType: mapToTSType(a),
      isEnum: a.isEnum,
      required: a.required,
      defaultValue: a.defaultValue ?? (a.required ? "''" : 'null'),
      inputType: computeInputType(a),
      length: a.length,
    }));
}

function computeInputType(a: AttributeDef): string {
  if (a.isEnum) return 'select';
  if (a.type === 'String' && (a.length ?? 999) > 200) return 'textarea';
  if (['Integer', 'Long', 'Float', 'Double'].includes(a.type)) return 'number';
  return 'text';
}

function isCommentTarget(entity: EntityDef, ir: IR): boolean {
  return ir.entities.some(outer =>
    outer.relationships.some(r => r.type === 'one_to_many' && r.target === entity.name),
  ) && entity.attributes.some(a => a.name === 'text');
}

function buildComponentFlags(entity: EntityDef, ir: IR, hasCommentSupport: boolean): VueComponentFlags {

  return {
    shouldRenderCard: !isCommentTarget(entity, ir),
    shouldRenderForm: entity.useCases.some(uc => uc.name === 'create') || entity.useCases.some(uc => ['update', 'update_status', 'update_priority'].includes(uc.name)),
    shouldRenderStatusBadge: entity.attributes.some(a => a.name === 'status' && a.isEnum),
    shouldRenderPriorityBadge: entity.attributes.some(a => a.name === 'priority' && a.isEnum),
    shouldRenderAssigneeBadge: entity.relationships.some(r => r.name === 'assignee'),
  };
}

function buildImports(
  _entity: EntityDef,
  _components: VueComponentFlags,
  _hasCommentSupport: boolean,
): any {
  return {
    domain: [],
    infrastructure: [],
    components: [],
    stores: [],
  };
}

function inferCategory(uc: UseCaseDef): string {
  const name = uc.name;
  if (name === 'create') return 'create';
  if (uc.httpMethod === 'DELETE') return 'delete';
  if (uc.httpMethod === 'GET') return 'read';
  if (name === 'update' || name === 'update_status' || name === 'update_priority') return 'update';
  return 'action';
}

function mapActionCategory(uc: UseCaseDef): string {
  const name = uc.name;
  if (name === 'create') return 'create';
  if (name === 'get_all' || name === 'load_users') return 'read';
  if (name === 'get_by_id') return 'readById';
  if (name === 'update_status') return 'updateStatus';
  if (name === 'update_priority') return 'updatePriority';
  if (name === 'assign_user') return 'assign';
  if (name === 'unassign_user') return 'unassign';
  if (name === 'add_comment') return 'comment';
  return 'default';
}

function buildApiPath(entityKebab: string, _entityCamel: string, uc: UseCaseDef, paramNames: string[], parentEntityKebab?: string): string {
  const effectiveKebab = (uc.name === 'add_comment' && parentEntityKebab) ? parentEntityKebab : entityKebab;
  const base = `/${effectiveKebab}s`;
  const idVar = paramNames.length > 0 ? paramNames[0] : 'id';
  if (uc.pathSuffix) return `${base}${uc.pathSuffix.replace(/\{id\}/g, `\${${idVar}}`)}`;
  if (!uc.needsId && uc.httpMethod === 'GET') return base;
  if (uc.name === 'create') return base;
  if (uc.needsId) return `${base}/\${${idVar}}`;
  return base;
}

function buildResponseType(
  entity: EntityDef,
  uc: UseCaseDef,
  isList: boolean,
  commentEntity: EntityDef | undefined,
): string {
  if (uc.name === 'add_comment' && commentEntity) return commentEntity.namePascal;
  if (!uc.needsPayload && uc.needsId && uc.httpMethod === 'DELETE') return 'void';
  if (isList) return `${entity.namePascal}[]`;
  return entity.namePascal;
}

function buildParamNames(entity: EntityDef, uc: UseCaseDef): string[] {
  if (!uc.needsId && uc.httpMethod === 'GET') return [];
  if (uc.name === 'get_by_id') return ['id'];
  if (uc.name === 'create') return ['data'];
  if (uc.name === 'add_comment') return [`${entity.nameCamel}Id`, 'text'];
  if (uc.needsId && uc.needsPayload) return [`${entity.nameCamel}Id`, 'value'];
  if (uc.needsId) return [`${entity.nameCamel}Id`];
  return [];
}

function buildParamTypes(entity: EntityDef, uc: UseCaseDef): string[] {
  if (!uc.needsId && uc.httpMethod === 'GET') return [];
  if (uc.name === 'get_by_id') return ['string'];
  if (uc.name === 'add_comment') return ['string', 'string'];
  if (uc.name === 'create') return [`Omit<${entity.namePascal}, 'id' | 'createdAt'>`];
  if (uc.needsId && uc.needsPayload) {
    let valType = 'string';
    if (uc.name === 'update_status') {
      valType = entity.attributes.find(a => a.name === 'status')?.type ?? 'string';
    } else if (uc.name === 'update_priority') {
      valType = entity.attributes.find(a => a.name === 'priority')?.type ?? 'string';
    } else {
      valType = entity.attributes.find(a => a.isEnum && !a.primary)?.type ?? 'string';
    }
    return ['string', valType];
  }
  if (uc.needsId) return ['string'];
  return [];
}

function buildMethodParams(entity: EntityDef, uc: UseCaseDef): string {
  if (!uc.needsId && uc.httpMethod === 'GET') return '';
  if (uc.name === 'get_by_id') return 'id: string';
  if (uc.name === 'add_comment') return `${entity.nameCamel}Id: string, text: string`;
  if (uc.name === 'create') return `data: Omit<${entity.namePascal}, 'id' | 'createdAt'>`;
  if (uc.needsId && uc.needsPayload) {
    let valType = 'string';
    if (uc.name === 'update_status') {
      valType = entity.attributes.find(a => a.name === 'status')?.type ?? 'string';
    } else if (uc.name === 'update_priority') {
      valType = entity.attributes.find(a => a.name === 'priority')?.type ?? 'string';
    } else {
      valType = entity.attributes.find(a => a.isEnum && !a.primary)?.type ?? 'string';
    }
    return `${entity.nameCamel}Id: string, value: ${valType}`;
  }
  if (uc.needsId) return `${entity.nameCamel}Id: string`;
  return '';
}

function buildUseCases(entity: EntityDef, ir: IR, commentEntity: EntityDef | undefined): Record<string, VueUseCaseDef> {
  const result: Record<string, VueUseCaseDef> = {};

  for (const uc of entity.useCases) {
    const category = uc.category ?? inferCategory(uc);
    const actionCategory = mapActionCategory(uc);
    const isList = category === 'read' && !uc.needsId;

    result[uc.name] = {
      name: uc.name,
      methodName: uc.methodName,
      httpMethod: uc.httpMethod,
      apiCall: {
        path: buildApiPath(
          entity.nameKebab, entity.nameCamel, uc, buildParamNames(entity, uc),
          ir.entities.find(e => e.relationships.some(r => r.type === 'one_to_many' && r.target === entity.name))?.nameKebab,
        ),
        hasBody: uc.needsPayload,
        bodyType: uc.needsPayload ? 'Record<string, string>' : 'void',
        responseType: buildResponseType(entity, uc, isList, commentEntity),
      },
      storeAction: {
        actionName: uc.methodName,
        paramNames: buildParamNames(entity, uc),
        paramTypes: buildParamTypes(entity, uc),
        routeAfter: uc.name === 'create' ? `/${entity.nameKebab}s/` : undefined,
        ruleChecks: (entity.entityRules ?? []).filter(r => r.on === uc.name).map(r => ({
          nameCamel: r.nameCamel,
          namePascal: r.namePascal,
          guardExpression: r.guard ? r.guard.replace(/\bentity\b/g, entity.nameCamel) : '',
          message: r.message,
          on: r.on,
        })),
      },
      methodSignature: {
        params: buildMethodParams(entity, uc),
        returnType: buildResponseType(entity, uc, isList, commentEntity),
      },
      actionCategory,
      needsId: uc.needsId,
      returnType: buildResponseType(entity, uc, isList, commentEntity),
    };
  }

  return result;
}

function buildStoreActionBody(
  entity: EntityDef,
  uc: VueUseCaseDef,
  actionCategory: string,
  stateList: string,
): string {
  const bodyParts: string[] = [];
  const idParam = uc.storeAction.paramNames[0] ?? '';
  const valParam = uc.storeAction.paramNames[1] ?? '';
  const entityVar = entity.nameCamel;

  const ruleChecks = uc.storeAction.ruleChecks;
  const hasTransitions = uc.actionCategory === 'updateStatus' && entity.transitions && Object.keys(entity.transitions).length > 0;
  const attrNames = new Set(entity.attributes.map(a => a.name));

  function buildRuleCheckLines(action: string): string[] {
    return ruleChecks.map(check => {
      let expr = check.guardExpression;
      if (action === 'create') {
        for (const attrName of attrNames) {
          const barePattern = new RegExp(`\\b${attrName}\\b(?=\\s*[\\.\\(\\[\\]])`, 'g');
          expr = expr.replace(barePattern, `data.${attrName}`);
        }
      } else if (action === 'updateStatus' || action === 'updatePriority') {
        expr = expr.replace(/\bnewStatus\b/g, 'value');
        expr = expr.replace(/\bnewPriority\b/g, 'value');
      }
      return `if (!(${expr})) { this.error = '${check.message}'; return; }`;
    });
  }

  if (actionCategory === 'read') {
    bodyParts.push(...buildRuleCheckLines(actionCategory));
    bodyParts.push(`this.loading = true; this.error = null;`);
    bodyParts.push(`try { this.${stateList} = await service.${uc.methodName}(); }`);
    bodyParts.push(`catch (e) { this.error = e instanceof Error ? e.message : 'Error loading ${entityVar}s'; }`);
    bodyParts.push(`finally { this.loading = false; }`);
  } else if (actionCategory === 'readById') {
    bodyParts.push(...buildRuleCheckLines(actionCategory));
    bodyParts.push(`this.loading = true; this.error = null;`);
    bodyParts.push(`try { this.current = await service.${uc.methodName}(${uc.storeAction.paramNames.join(', ')}); }`);
    bodyParts.push(`catch (e) { this.error = e instanceof Error ? e.message : 'Error loading ${entityVar}'; }`);
    bodyParts.push(`finally { this.loading = false; }`);
  } else if (actionCategory === 'create') {
    bodyParts.push(...buildRuleCheckLines(actionCategory));
    bodyParts.push(`this.loading = true; this.error = null;`);
    bodyParts.push(`try { const created = await service.${uc.methodName}(${uc.storeAction.paramNames.join(', ')});`);
    bodyParts.push(`  this.${stateList}.push(created); return created;`);
    bodyParts.push(`} catch (e) { this.error = e instanceof Error ? e.message : 'Error creating ${entityVar}'; throw e; }`);
    bodyParts.push(`finally { this.loading = false; }`);
  } else if (actionCategory === 'updateStatus') {
    bodyParts.push(`this.error = null;`);
    bodyParts.push(`try { const ${entityVar} = this.${stateList}.find(t => t.id === ${idParam});`);
    bodyParts.push(`  if (!${entityVar}) { this.error = '${entity.namePascal} not found'; return; }`);
    bodyParts.push(...buildRuleCheckLines(actionCategory).map(l => `  ${l}`));
    if (hasTransitions) {
      bodyParts.push(`  const statusAttr = ${entityVar}.status as string;`);
      bodyParts.push(`  if (!VALID_TRANSITIONS[statusAttr]?.includes(${valParam})) {`);
      bodyParts.push(`    this.error = \`Invalid transition from \${statusAttr} to \${${valParam}}\`;`);
      bodyParts.push(`    return;`);
      bodyParts.push(`  }`);
    }
    bodyParts.push(`  await service.${uc.methodName}(${uc.storeAction.paramNames.join(', ')});`);
    bodyParts.push(`  ${entityVar}.status = ${valParam};`);
    bodyParts.push(`  if (this.current?.id === ${idParam}) this.current.status = ${valParam};`);
    bodyParts.push(`} catch (e) { this.error = e instanceof Error ? e.message : 'Error updating status'; throw e; }`);
  } else if (actionCategory === 'updatePriority') {
    bodyParts.push(`this.error = null;`);
    bodyParts.push(`try { const ${entityVar} = this.${stateList}.find(t => t.id === ${idParam});`);
    bodyParts.push(`  if (!${entityVar}) { this.error = '${entity.namePascal} not found'; return; }`);
    bodyParts.push(...buildRuleCheckLines(actionCategory).map(l => `  ${l}`));
    bodyParts.push(`  await service.${uc.methodName}(${uc.storeAction.paramNames.join(', ')});`);
    bodyParts.push(`  ${entityVar}.priority = ${valParam};`);
    bodyParts.push(`  if (this.current?.id === ${idParam}) this.current.priority = ${valParam};`);
    bodyParts.push(`} catch (e) { this.error = e instanceof Error ? e.message : 'Error updating priority'; throw e; }`);
  } else if (actionCategory === 'assign') {
    bodyParts.push(`this.error = null;`);
    bodyParts.push(`try { const ${entityVar} = this.${stateList}.find(t => t.id === ${idParam});`);
    bodyParts.push(`  if (!${entityVar}) { this.error = '${entity.namePascal} not found'; return; }`);
    bodyParts.push(...buildRuleCheckLines(actionCategory).map(l => `  ${l}`));
    bodyParts.push(`  await service.${uc.methodName}(${uc.storeAction.paramNames.join(', ')});`);
    bodyParts.push(`  ${entityVar}.assigneeId = ${valParam};`);
    bodyParts.push(`  if (this.current?.id === ${idParam}) this.current.assigneeId = ${valParam};`);
    bodyParts.push(`} catch (e) { this.error = e instanceof Error ? e.message : 'Error assigning user'; throw e; }`);
  } else if (actionCategory === 'unassign') {
    bodyParts.push(`this.error = null;`);
    bodyParts.push(`try { const ${entityVar} = this.${stateList}.find(t => t.id === ${idParam});`);
    bodyParts.push(`  if (!${entityVar}) { this.error = '${entity.namePascal} not found'; return; }`);
    bodyParts.push(...buildRuleCheckLines(actionCategory).map(l => `  ${l}`));
    bodyParts.push(`  await service.${uc.methodName}(${uc.storeAction.paramNames.join(', ')});`);
    bodyParts.push(`  ${entityVar}.assigneeId = null;`);
    bodyParts.push(`  if (this.current?.id === ${idParam}) this.current.assigneeId = null;`);
    bodyParts.push(`} catch (e) { this.error = e instanceof Error ? e.message : 'Error unassigning user'; throw e; }`);
  } else if (actionCategory === 'comment') {
    bodyParts.push(`this.error = null;`);
    bodyParts.push(`try { const ${entityVar} = this.${stateList}.find(t => t.id === ${idParam});`);
    bodyParts.push(`  if (!${entityVar}) { this.error = '${entity.namePascal} not found'; return null as unknown as ${uc.methodSignature.returnType}; }`);
    bodyParts.push(...buildRuleCheckLines(actionCategory).map(l => `  ${l}`));
    bodyParts.push(`  const createdComment = await service.${uc.methodName}(${uc.storeAction.paramNames.join(', ')});`);
    bodyParts.push(`  if (this.current?.id === ${idParam}) this.current.comments.push(createdComment);`);
    bodyParts.push(`  return createdComment;`);
    bodyParts.push(`} catch (e) { this.error = e instanceof Error ? e.message : 'Error adding comment'; throw e; }`);
  } else {
    bodyParts.push(...buildRuleCheckLines(actionCategory));
    bodyParts.push(`this.error = null;`);
    bodyParts.push(`try { await service.${uc.methodName}(${uc.storeAction.paramNames.join(', ')}); }`);
    bodyParts.push(`catch (e) { this.error = e instanceof Error ? e.message : 'Error in ${uc.methodName}'; throw e; }`);
  }

  return bodyParts.join('\n        ');
}

function deriveStoreActions(entity: EntityDef, useCases: Record<string, VueUseCaseDef>): VueStoreAction[] {
  return Object.values(useCases).map(uc => {
    const actionCategory = uc.actionCategory;
    const stateList = entity.nameCamel + 's';
    const body = buildStoreActionBody(entity, uc, actionCategory, stateList);
    return {
      name: uc.storeAction.actionName,
      params: uc.storeAction.paramNames.map((name, i) => ({
        name,
        type: uc.storeAction.paramTypes[i] ?? 'string',
      })),
      body,
      hasRuleChecks: uc.storeAction.ruleChecks.length > 0,
      actionCategory,
    };
  });
}

function buildRuleChecks(entity: EntityDef): VueRuleCheck[] {
  return (entity.entityRules ?? []).map(r => ({
    nameCamel: r.nameCamel,
    namePascal: r.namePascal,
    guardExpression: r.guard ? r.guard.replace(/\bentity\b/g, entity.nameCamel) : '',
    message: r.message,
    on: r.on,
  }));
}

function buildEnumAttributes(entity: EntityDef, ir: IR): VueEnumAttribute[] {
  const enumAttrs = entity.attributes.filter(a => a.isEnum);
  return enumAttrs.map(a => {
    const enumDef = ir.enums.find(e => e.name === a.type);
    return {
      name: a.name,
      namePascal: a.namePascal,
      type: a.type,
      values: enumDef?.values ?? [],
      labelsConstant: `${a.type}_LABELS`,
    };
  });
}
