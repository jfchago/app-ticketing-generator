// generation/spring/builder.ts — Builds Spring Generation Model from IR
// Pre-computes everything Spring templates currently compute at render time.

import type { IR, EntityDef, AttributeDef, UseCaseDef } from '../../ir/types.js';
import type {
  SpringGenerationModel, SpringGeneratedEntity, SpringAttributeType,
  SpringServiceMethod, SpringEndpoint, SpringRepositoryMethod,
  SpringRuleCheck, SpringEventPublisher, SpringSeedData,
} from './types.js';

export function buildSpringGenerationModel(ir: IR): SpringGenerationModel {
  const entities: Record<string, SpringGeneratedEntity> = {};

  for (const entity of ir.entities) {
    entities[entity.name] = buildSpringEntity(entity, ir);
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
    globalImports: buildGlobalImports(ir),
    seedData: buildSeedData(ir),
    features: ir.buildFeatures,
  };
}

function buildSpringEntity(entity: EntityDef, ir: IR): SpringGeneratedEntity {
  const pkType = entity.primaryKey?.type ?? 'String';
  const pkJavaType = mapToJavaType(pkType);

  const attributeTypes = buildAttributeTypes(entity);
  const serviceMethods = buildServiceMethods(entity, ir);
  const endpoints = buildEndpoints(entity, ir);

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
    packagePath: ir.application.basePackage.replace(/\./g, '/'),
    pkJavaType,
    attributeTypes,
    imports: buildSpringImports(entity, ir),
    serviceMethods,
    endpoints,
    repositoryMethods: buildRepositoryMethods(entity),
    transitions: entity.transitions ?? {},
    ruleChecks: buildSpringRuleChecks(entity),
    hasCreatedAt: entity.attributes.some(a => a.name === 'createdAt'),
    hasUpdatedAt: entity.attributes.some(a => a.name === 'updatedAt'),
    oneToManyRelations: entity.relationships
      .filter(r => r.type === 'one_to_many')
      .map(r => ({ name: r.name, namePascal: r.namePascal, target: r.target, targetPascal: r.targetPascal, foreignKey: r.foreignKey })),
    manyToOneRelations: entity.relationships
      .filter(r => r.type === 'many_to_one')
      .map(r => ({ name: r.name, namePascal: r.namePascal, target: r.target, targetPascal: r.targetPascal, foreignKey: r.foreignKey })),
    emitsEvents: (ir.events?.length ?? 0) > 0 || (entity.entityEvents?.length ?? 0) > 0,
    eventPublishers: buildEventPublishers(ir, entity),
  };
}

function mapToJavaType(dslType: string): string {
  const map: Record<string, string> = {
    String: 'String', Integer: 'Long', Long: 'Long',
    Float: 'Double', Double: 'Double', Boolean: 'Boolean',
    Date: 'LocalDateTime', DateTime: 'LocalDateTime', Timestamp: 'LocalDateTime',
  };
  return map[dslType] ?? 'String';
}

function buildAttributeTypes(entity: EntityDef): Record<string, SpringAttributeType> {
  const result: Record<string, SpringAttributeType> = {};
  for (const a of entity.attributes) {
    const javaType = mapToJavaType(a.type);
    result[a.name] = {
      javaType: a.isEnum ? a.type : javaType,
      needsImport: a.isEnum,
      importPath: a.isEnum ? `entity.${a.type}` : '',
      isEnum: a.isEnum,
      isPrimitive: a.isPrimitive,
      jpaAnnotation: buildJpaAnnotation(a),
    };
  }
  return result;
}

function buildJpaAnnotation(a: AttributeDef): string {
  const parts: string[] = [];
  parts.push(`name = "${a.column ?? a.name}"`);
  if (a.length) parts.push(`length = ${a.length}`);
  parts.push(`nullable = ${a.nullable}`);
  if (a.unique) parts.push('unique = true');
  return parts.join(', ');
}

function findCommentEntity(entity: EntityDef, ir: IR): EntityDef | undefined {
  const commentRel = entity.relationships.find(
    r => r.type === 'one_to_many' && ir.entities.some(e => e.name === r.target && e.attributes.some(a => a.name === 'text')),
  );
  return commentRel ? ir.entities.find(e => e.name === commentRel.target) : undefined;
}

function buildServiceMethods(entity: EntityDef, ir: IR): SpringServiceMethod[] {
  const methods: SpringServiceMethod[] = [];
  const commentEntity = findCommentEntity(entity, ir);

  for (const uc of entity.useCases) {
    const method = buildServiceMethod(entity, uc, ir, commentEntity);
    methods.push(method);
  }

  return methods;
}

function buildServiceMethod(
  entity: EntityDef,
  uc: UseCaseDef,
  ir: IR,
  commentEntity: EntityDef | undefined,
): SpringServiceMethod {
  const name = uc.methodName;
  const category = uc.category ?? 'action';
  const rules = (entity.entityRules ?? []).filter(r => r.on === uc.name);
  const hasRules = rules.length > 0;
  const ruleChecks = rules.map(r => ({
    nameCamel: r.nameCamel, namePascal: r.namePascal,
    guardJava: r.guard, message: r.message, on: r.on,
  }));

  const pkType = entity.primaryKey?.type ?? 'String';
  const pkJavaType = mapToJavaType(pkType);

  let returnType: string;
  let params: string;
  let body: string;
  let annotations: string[];
  let transitionGuard: string | undefined;
  const eventCalls: string[] = [];

  const commentRel = commentEntity
    ? entity.relationships.find(r => r.target === commentEntity.name)
    : undefined;
  const statusAttr = entity.attributes.find(a => a.name === 'status' && a.isEnum);
  const priorityAttr = entity.attributes.find(a => a.name === 'priority' && a.isEnum);
  const assigneeRel = entity.relationships.find(r => r.name === 'assignee');

  if (category === 'read' && !uc.needsId) {
    returnType = `List<${entity.namePascal}DTO>`;
    params = '';
    annotations = ['@Transactional(readOnly = true)'];
    body = `return ${entity.nameCamel}Repository.findAll().stream().map(${entity.nameCamel}Mapper::toDTO).toList();`;
  } else if (category === 'read' && uc.needsId) {
    returnType = `${entity.namePascal}DTO`;
    params = `${pkJavaType} id`;
    annotations = ['@Transactional(readOnly = true)'];
    body = `return ${entity.nameCamel}Repository.findById(id).map(${entity.nameCamel}Mapper::toDTO).orElseThrow(() -> new RuntimeException("${entity.namePascal} not found: " + id));`;
  } else if (uc.name === 'create' || (category === 'create')) {
    returnType = `${entity.namePascal}DTO`;
    params = `${entity.namePascal}DTO dto`;
    annotations = ['@Transactional'];
    const ruleBody = buildRuleCheckBody(ruleChecks, entity, uc.name);
    const pkField = entity.primaryKey?.name ?? 'id';
    body = `${entity.namePascal} ${entity.nameCamel} = ${entity.nameCamel}Mapper.toEntity(dto);\n        if (${entity.nameCamel}Repository.findById(${entity.nameCamel}.get${pkField.charAt(0).toUpperCase() + pkField.slice(1)}()).isPresent()) { throw new RuntimeException("${entity.namePascal} already exists"); }\n        ${ruleBody}\n        ${entity.nameCamel}Repository.save(${entity.nameCamel});\n        ${buildEventPublishBody(ir, entity, uc.name)}\n        return ${entity.nameCamel}Mapper.toDTO(${entity.nameCamel});`;
  } else if (uc.name === 'update_status' && statusAttr) {
    returnType = `${entity.namePascal}DTO`;
    params = `${pkJavaType} id, String status`;
    annotations = ['@Transactional'];
    transitionGuard = buildTransitionGuard(entity);
    body = `var ${entity.nameCamel} = ${entity.nameCamel}Repository.findById(id).orElseThrow(() -> new RuntimeException("${entity.namePascal} not found: " + id));\n        ${buildRuleCheckBody(ruleChecks, entity, uc.name)}\n        ${entity.nameCamel}.setStatus(${statusAttr.type}.valueOf(status));\n        ${entity.nameCamel}Repository.save(${entity.nameCamel});\n        ${buildEventPublishBody(ir, entity, uc.name)}\n        return ${entity.nameCamel}Mapper.toDTO(${entity.nameCamel});`;
  } else if (uc.name === 'update_priority' && priorityAttr) {
    returnType = `${entity.namePascal}DTO`;
    params = `${pkJavaType} id, String priority`;
    annotations = ['@Transactional'];
    body = `var ${entity.nameCamel} = ${entity.nameCamel}Repository.findById(id).orElseThrow(() -> new RuntimeException("${entity.namePascal} not found: " + id));\n        ${buildRuleCheckBody(ruleChecks, entity, uc.name)}\n        ${entity.nameCamel}.setPriority(${priorityAttr.type}.valueOf(priority));\n        ${entity.nameCamel}Repository.save(${entity.nameCamel});\n        return ${entity.nameCamel}Mapper.toDTO(${entity.nameCamel});`;
  } else if (uc.name === 'assign_user' && assigneeRel) {
    returnType = `${entity.namePascal}DTO`;
    params = `${pkJavaType} id, String userId`;
    annotations = ['@Transactional'];
    const assigneeField = assigneeRel.foreignKey.replace(/_id$/i, 'Id');
    body = `var ${entity.nameCamel} = ${entity.nameCamel}Repository.findById(id).orElseThrow(() -> new RuntimeException("${entity.namePascal} not found: " + id));\n        ${entity.nameCamel}.set${assigneeField.charAt(0).toUpperCase() + assigneeField.slice(1)}(userId);\n        ${entity.nameCamel}Repository.save(${entity.nameCamel});\n        ${buildEventPublishBody(ir, entity, uc.name)}\n        return ${entity.nameCamel}Mapper.toDTO(${entity.nameCamel});`;
  } else if (uc.name === 'unassign_user' && assigneeRel) {
    returnType = `${entity.namePascal}DTO`;
    params = `${pkJavaType} id`;
    annotations = ['@Transactional'];
    const unassignField = assigneeRel.foreignKey.replace(/_id$/i, 'Id');
    body = `var ${entity.nameCamel} = ${entity.nameCamel}Repository.findById(id).orElseThrow(() -> new RuntimeException("${entity.namePascal} not found: " + id));\n        ${entity.nameCamel}.set${unassignField.charAt(0).toUpperCase() + unassignField.slice(1)}(null);\n        ${entity.nameCamel}Repository.save(${entity.nameCamel});\n        return ${entity.nameCamel}Mapper.toDTO(${entity.nameCamel});`;
  } else if (uc.name === 'add_comment' && commentEntity && commentRel) {
    const commentPascal = commentEntity.namePascal;
    const commentCamel = commentEntity.nameCamel;
    const foreignKeyField = commentRel.foreignKey.replace(/_id$/i, 'Id');
    returnType = `${commentPascal}DTO`;
    params = `${pkJavaType} id, String text`;
    annotations = ['@Transactional'];
    const pkField = entity.primaryKey?.name ?? 'id';
    body = `var ${entity.nameCamel} = ${entity.nameCamel}Repository.findById(id).orElseThrow(() -> new RuntimeException("${entity.namePascal} not found: " + id));\n        ${commentPascal} ${commentCamel} = new ${commentPascal}();\n        ${commentCamel}.setId(UUID.randomUUID().toString());\n        ${commentCamel}.set${foreignKeyField.charAt(0).toUpperCase() + foreignKeyField.slice(1)}(String.valueOf(${entity.nameCamel}.get${pkField.charAt(0).toUpperCase() + pkField.slice(1)}()));\n        ${commentCamel}.setText(text);\n        ${commentCamel}.setAuthorId("system");\n        ${commentCamel}.setCreatedAt(LocalDateTime.now());\n        ${commentCamel}Repository.save(${commentCamel});\n        return ${commentCamel}Mapper.toDTO(${commentCamel});`;
  } else {
    returnType = 'void';
    params = '';
    annotations = [];
    body = '';
  }

  return { name, returnType, params, body, annotations, hasRules, ruleChecks, transitionGuard, eventPublishCalls: eventCalls };
}

function buildTransitionGuard(_entity: EntityDef): string {
  return `if (!VALID_TRANSITIONS.get(entity.getStatus().name()).contains(status)) {\n          throw new RuntimeException("Invalid transition");\n        }`;
}

function buildRuleCheckBody(ruleChecks: SpringRuleCheck[], entity: EntityDef, action?: string): string {
  if (ruleChecks.length === 0) return '';
  const attrNames = new Set(entity.attributes.map(a => a.name));
  const relNames = new Set(entity.relationships.map(r => r.name));
  const allMemberNames = new Set([...attrNames, ...relNames]);
  return ruleChecks.map(r => {
    let condition = r.guardJava
      .replace(/\bentity\./g, `${entity.nameCamel}.`)
      .replace(/\bnewStatus\b/g, 'status')
      .replace(/\bnewPriority\b/g, 'priority')
      .replace(/!==/g, '!=')
      .replace(/===/g, '==');
    if (action === 'create') {
      for (const attrName of attrNames) {
        const barePattern = new RegExp(`\\b${attrName}\\b(?!\\s*\\()`, 'g');
        condition = condition.replace(barePattern, `${entity.nameCamel}.get${attrName.charAt(0).toUpperCase() + attrName.slice(1)}()`);
      }
    }
    condition = condition.replace(
      /\b(\w+)\.(\w+)\b/g,
      (match, obj, prop) => {
        if (!allMemberNames.has(prop)) return match;
        const getter = `${obj}.get${prop.charAt(0).toUpperCase() + prop.slice(1)}()`;
        return getter;
      },
    );
    for (const relName of relNames) {
      const pascal = relName.charAt(0).toUpperCase() + relName.slice(1);
      condition = condition.replace(
        new RegExp(`\\.get${pascal}\\(\\)\\.length\\b`, 'g'),
        `.get${pascal}().size()`,
      );
    }
    condition = condition.replace(/\.length\b(?!\s*\()/g, '.length()');
    return `if (!(${condition})) { throw new RuntimeException("${r.message}"); }`;
  }).join('\n        ');
}

function buildEventPublishBody(ir: IR, entity: EntityDef, _action: string): string {
  const events = ir.events ?? [];
  const matching = events.filter(ev => ev.namePascal.startsWith(entity.namePascal));
  if (matching.length === 0) return '';
  return matching.map(ev => `${ev.nameCamel}EventPublisher.publish(${entity.nameCamel});`).join('\n        ');
}

function buildEndpoints(entity: EntityDef, ir: IR): SpringEndpoint[] {
  const commentEntity = findCommentEntity(entity, ir);
  return entity.useCases.map(uc => {
    const pkJavaType = mapToJavaType(entity.primaryKey?.type ?? 'String');
    const needsMap = (uc.needsPayload && !(uc.name === 'create' || categoryIsCreate(entity, uc))) || uc.name === 'add_comment';

    let annotation: string;
    if (uc.httpMethod === 'GET') annotation = '@GetMapping';
    else if (uc.httpMethod === 'POST') annotation = '@PostMapping';
    else if (uc.httpMethod === 'PUT') annotation = '@PutMapping';
    else if (uc.httpMethod === 'PATCH') annotation = '@PatchMapping';
    else annotation = '@DeleteMapping';

    let returnType = `${entity.namePascal}DTO`;
    let params = `@PathVariable ${pkJavaType} id`;
    let body = '';

    if (!uc.needsId && uc.httpMethod === 'GET') {
      returnType = `List<${entity.namePascal}DTO>`;
      params = '';
      body = `return ${entity.nameCamel}Service.${uc.methodName}();`;
    } else if (uc.name === 'get_by_id') {
      body = `return ${entity.nameCamel}Service.${uc.methodName}(id);`;
    } else if (uc.name === 'add_comment' && commentEntity) {
      returnType = `${commentEntity.namePascal}DTO`;
      params = `@PathVariable ${pkJavaType} id, @RequestBody java.util.Map<String, String> body`;
      body = `return ResponseEntity.ok(${entity.nameCamel}Service.${uc.methodName}(id, body.get("text")));`;
    } else if (uc.name === 'create' || categoryIsCreate(entity, uc)) {
      params = `@RequestBody ${entity.namePascal}DTO dto`;
      body = `return ResponseEntity.ok(${entity.nameCamel}Service.${uc.methodName}(dto));`;
    }

    return { httpMethod: uc.httpMethod, annotation, path: uc.pathSuffix, returnType, params, body, needsMap };
  });
}

function categoryIsCreate(entity: EntityDef, uc: UseCaseDef): boolean {
  return uc.name === 'create' || (uc.httpMethod === 'POST' && !uc.needsId && uc.needsPayload);
}

function buildRepositoryMethods(entity: EntityDef): SpringRepositoryMethod[] {
  const methods: SpringRepositoryMethod[] = [];
  if (entity.useCases.some(uc => uc.name === 'get_all')) {
    methods.push({ name: 'findAllByOrderByCreatedAtDesc', signature: `List<${entity.namePascal}> findAllByOrderByCreatedAtDesc()`, isCustom: false });
  }
  return methods;
}

function buildSpringRuleChecks(entity: EntityDef): SpringRuleCheck[] {
  return (entity.entityRules ?? []).map(r => ({
    nameCamel: r.nameCamel,
    namePascal: r.namePascal,
    guardJava: r.guard,
    message: r.message,
    on: r.on,
  }));
}

function buildSpringImports(entity: EntityDef, ir: IR): any {
  return {
    standard: [],
    domain: ir.entities.filter((e: EntityDef) => e.name !== entity.name).map((e: EntityDef) => e.namePascal),
    spring: [],
  };
}

function buildEventPublishers(ir: IR, entity: EntityDef): SpringEventPublisher[] {
  const events = ir.events ?? [];
  return events
    .filter(ev => ev.source === entity.name || ev.namePascal.startsWith(entity.namePascal))
    .map(ev => ({
      name: ev.name,
      eventClass: `${ev.namePascal}Event`,
      eventName: ev.nameCamel,
    }));
}

function buildSeedData(_ir: IR): SpringSeedData | undefined {
  return undefined;
}

function buildGlobalImports(_ir: IR): string[] {
  return [];
}
