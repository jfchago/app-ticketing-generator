// generation/spring/builder.ts — Builds Spring Generation Model from IR
// Pre-computes everything Spring templates currently compute at render time.

import type { IR, EntityDef, AttributeDef, UseCaseDef } from '../../ir/types.js';
import type {
  SpringGenerationModel,
  SpringGeneratedEntity,
  SpringAttributeType,
  SpringServiceMethod,
  SpringEndpoint,
  SpringRepositoryMethod,
  SpringRuleCheck,
  SpringEventPublisher,
  SpringSeedData,
} from './types.js';

export function buildSpringGenerationModel(ir: IR): SpringGenerationModel {
  const entities: Record<string, SpringGeneratedEntity> = {};

  for (const entity of ir.entities) {
    entities[entity.name] = buildSpringEntity(entity, ir);
  }

  return {
    ir,
    entities,
    enums: ir.enums.map((e) => ({
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
    hasCreate: entity.useCases.some((uc) => uc.name === 'create'),
    hasUpdate: entity.useCases.some((uc) =>
      ['update', 'update_status', 'update_priority'].includes(uc.name),
    ),
    hasDelete: entity.useCases.some((uc) => uc.name === 'delete'),
    hasGetAll: entity.useCases.some((uc) => uc.name === 'get_all' || uc.name === 'load_users'),
    hasGetById: entity.useCases.some((uc) => uc.name === 'get_by_id'),
    packagePath: ir.application.basePackage.replace(/\./g, '/'),
    pkJavaType,
    attributeTypes,
    imports: buildSpringImports(entity, ir),
    serviceMethods,
    needsMapper: serviceMethods.some((m) => m.returnType.includes('DTO')),
    endpoints,
    repositoryMethods: buildRepositoryMethods(entity),
    transitions: entity.transitions ?? {},
    ruleChecks: buildSpringRuleChecks(entity),
    hasCreatedAt: entity.attributes.some((a) => a.name === 'createdAt'),
    hasUpdatedAt: entity.attributes.some((a) => a.name === 'updatedAt'),
    oneToManyRelations: entity.relationships
      .filter((r) => r.type === 'one_to_many')
      .map((r) => ({
        name: r.name,
        namePascal: r.namePascal,
        target: r.target,
        targetPascal: r.targetPascal,
        foreignKey: r.foreignKey,
      })),
    manyToOneRelations: entity.relationships
      .filter((r) => r.type === 'many_to_one')
      .map((r) => ({
        name: r.name,
        namePascal: r.namePascal,
        target: r.target,
        targetPascal: r.targetPascal,
        foreignKey: r.foreignKey,
      })),
    emitsEvents: (ir.events?.length ?? 0) > 0 || (entity.entityEvents?.length ?? 0) > 0,
    eventPublishers: buildEventPublishers(ir, entity),
    hasActivityLog: entity.relationships.some(
      (r) => r.type === 'one_to_many' && r.target === 'ActivityLog'
    ),
  };
}

function mapToJavaType(dslType: string): string {
  const map: Record<string, string> = {
    String: 'String',
    Integer: 'Long',
    Long: 'Long',
    Float: 'Double',
    Double: 'Double',
    Boolean: 'Boolean',
    Date: 'LocalDateTime',
    DateTime: 'LocalDateTime',
    Timestamp: 'LocalDateTime',
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
    (r) =>
      r.type === 'one_to_many' &&
      ir.entities.some((e) => e.name === r.target && e.attributes.some((a) => a.name === 'text')),
  );
  return commentRel ? ir.entities.find((e) => e.name === commentRel.target) : undefined;
}

function findActivityLogEntity(entity: EntityDef, ir: IR): EntityDef | undefined {
  const activityLogRel = entity.relationships.find(
    (r) => r.type === 'one_to_many' && r.target === 'ActivityLog',
  );
  return activityLogRel ? ir.entities.find((e) => e.name === activityLogRel.target) : undefined;
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
  const rules = (entity.entityRules ?? []).filter((r) => r.on === uc.name);
  const hasRules = rules.length > 0;
  const ruleChecks = rules.map((r) => ({
    nameCamel: r.nameCamel,
    namePascal: r.namePascal,
    guardJava: r.guard,
    message: r.message,
    on: r.on,
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
    ? entity.relationships.find((r) => r.target === commentEntity.name)
    : undefined;
  const statusAttr = entity.attributes.find((a) => a.name === 'status' && a.isEnum);
  const priorityAttr = entity.attributes.find((a) => a.name === 'priority' && a.isEnum);
  const assigneeRel = entity.relationships.find((r) => r.name === 'assignee');
  const activityLogEntity = findActivityLogEntity(entity, ir);

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
  } else if (uc.name === 'create' || category === 'create') {
    returnType = `${entity.namePascal}DTO`;
    params = `${entity.namePascal}DTO dto`;
    annotations = ['@Transactional'];
    const ruleBody = buildRuleCheckBody(ruleChecks, entity, uc.name);
    const uniqueAttrs = entity.attributes.filter((a) => a.unique && !a.primary);
    let duplicateCheck = '';
    for (const attr of uniqueAttrs) {
      duplicateCheck += `if (${entity.nameCamel}Repository.existsBy${attr.namePascal}(dto.get${attr.namePascal}())) { throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "${entity.namePascal} with this ${attr.name} already exists"); }\n        `;
    }
    const mtoResolution = buildManyToOneResolutionBody(entity, ir, 'dto', entity.nameCamel);
    body = `${entity.namePascal} ${entity.nameCamel} = ${entity.nameCamel}Mapper.toEntity(dto);\n        ${mtoResolution ? mtoResolution + '\n        ' : ''}${duplicateCheck}${ruleBody}\n        ${entity.nameCamel}Repository.save(${entity.nameCamel});\n        ${entity.namePascal} old${entity.namePascal} = null;\n        String actor = resolveActor();\n        ${buildEventPublishBody(ir, entity, uc.name)}\n        return ${entity.nameCamel}Mapper.toDTO(${entity.nameCamel});`;
  } else if (uc.name === 'update_status' && statusAttr) {
    returnType = `${entity.namePascal}DTO`;
    params = `${pkJavaType} id, String status`;
    annotations = ['@Transactional'];
    transitionGuard = buildTransitionGuard(entity);
    body = `var ${entity.nameCamel} = ${entity.nameCamel}Repository.findById(id).orElseThrow(() -> new RuntimeException("${entity.namePascal} not found: " + id));\n        ${entity.namePascal} old${entity.namePascal} = new ${entity.namePascal}();\n        old${entity.namePascal}.setStatus(${entity.nameCamel}.getStatus());\n        ${buildRuleCheckBody(ruleChecks, entity, uc.name)}\n        ${transitionGuard}\n        ${entity.nameCamel}.setStatus(${statusAttr.type}.valueOf(status));\n        ${entity.nameCamel}Repository.save(${entity.nameCamel});\n        String actor = resolveActor();\n        ${buildEventPublishBody(ir, entity, uc.name)}\n        return ${entity.nameCamel}Mapper.toDTO(${entity.nameCamel});`;
  } else if (uc.name === 'update_priority' && priorityAttr) {
    returnType = `${entity.namePascal}DTO`;
    params = `${pkJavaType} id, String priority`;
    annotations = ['@Transactional'];
    body = `var ${entity.nameCamel} = ${entity.nameCamel}Repository.findById(id).orElseThrow(() -> new RuntimeException("${entity.namePascal} not found: " + id));\n        ${entity.namePascal} old${entity.namePascal} = new ${entity.namePascal}();\n        old${entity.namePascal}.setPriority(${entity.nameCamel}.getPriority());\n        ${buildRuleCheckBody(ruleChecks, entity, uc.name)}\n        ${entity.nameCamel}.setPriority(${priorityAttr.type}.valueOf(priority));\n        ${entity.nameCamel}Repository.save(${entity.nameCamel});\n        String actor = resolveActor();\n        ${buildEventPublishBody(ir, entity, uc.name)}\n        return ${entity.nameCamel}Mapper.toDTO(${entity.nameCamel});`;
  } else if (uc.name === 'assign_user' && assigneeRel) {
    returnType = `${entity.namePascal}DTO`;
    params = `${pkJavaType} id, String userId`;
    annotations = ['@Transactional'];
    const targetCamel = assigneeRel.target.charAt(0).toLowerCase() + assigneeRel.target.slice(1);
    const assigneeSetter = `set${assigneeRel.namePascal.charAt(0).toUpperCase() + assigneeRel.namePascal.slice(1)}`;
    body = `var ${entity.nameCamel} = ${entity.nameCamel}Repository.findById(id).orElseThrow(() -> new RuntimeException("${entity.namePascal} not found: " + id));\n        ${entity.namePascal} old${entity.namePascal} = new ${entity.namePascal}();\n        old${entity.namePascal}.setAssigneeId(${entity.nameCamel}.getAssigneeId());\n        ${entity.nameCamel}.${assigneeSetter}(${targetCamel}Repository.getReferenceById(userId));\n        ${entity.nameCamel}Repository.save(${entity.nameCamel});\n        String actor = resolveActor();\n        ${buildEventPublishBody(ir, entity, uc.name)}\n        return ${entity.nameCamel}Mapper.toDTO(${entity.nameCamel});`;
  } else if (uc.name === 'unassign_user' && assigneeRel) {
    returnType = `${entity.namePascal}DTO`;
    params = `${pkJavaType} id`;
    annotations = ['@Transactional'];
    const assigneeSetter = `set${assigneeRel.namePascal.charAt(0).toUpperCase() + assigneeRel.namePascal.slice(1)}`;
    body = `var ${entity.nameCamel} = ${entity.nameCamel}Repository.findById(id).orElseThrow(() -> new RuntimeException("${entity.namePascal} not found: " + id));\n        ${entity.namePascal} old${entity.namePascal} = new ${entity.namePascal}();\n        old${entity.namePascal}.setAssigneeId(${entity.nameCamel}.getAssigneeId());\n        ${entity.nameCamel}.${assigneeSetter}(null);\n        ${entity.nameCamel}Repository.save(${entity.nameCamel});\n        String actor = resolveActor();\n        ${buildEventPublishBody(ir, entity, uc.name)}\n        return ${entity.nameCamel}Mapper.toDTO(${entity.nameCamel});`;
  } else if (uc.name === 'add_comment' && commentEntity && commentRel) {
    const commentPascal = commentEntity.namePascal;
    const commentCamel = commentEntity.nameCamel;
    returnType = `${commentPascal}DTO`;
    params = `${pkJavaType} id, String text`;
    annotations = ['@Transactional'];
    const inverseRel = commentEntity.relationships.find(r => r.target === entity.name);
    const inverseRelSetter = inverseRel
      ? `set${inverseRel.namePascal.charAt(0).toUpperCase() + inverseRel.namePascal.slice(1)}`
      : '';
    body = `var ${entity.nameCamel} = ${entity.nameCamel}Repository.findById(id).orElseThrow(() -> new RuntimeException("${entity.namePascal} not found: " + id));\n        ${commentPascal} ${commentCamel} = new ${commentPascal}();\n        ${commentCamel}.${inverseRelSetter}(${entity.nameCamel});\n        ${commentCamel}.setText(text);\n        // TODO: set comment author from authentication context\n        ${commentCamel}Repository.save(${commentCamel});\n        return ${commentCamel}Mapper.toDTO(${commentCamel});`;
  } else if (uc.name === 'add_comment') {
    // Fallback for entity that IS the comment (no foreign entity)
    // NOTE: this path no longer triggers for Comment since `add_comment` was
    // removed from Comment's YAML use_cases. Kept for robustness.
    returnType = `${entity.namePascal}DTO`;
    params = `${pkJavaType} id, String text`;
    annotations = ['@Transactional'];
    body = `${entity.namePascal} ${entity.nameCamel} = new ${entity.namePascal}();\n        ${entity.nameCamel}.setText(text);\n        // TODO: set ticket and author via repository lookups (requires repository injection)\n        ${entity.nameCamel}Repository.save(${entity.nameCamel});\n        return ${entity.nameCamel}Mapper.toDTO(${entity.nameCamel});`;
  } else if (uc.name === 'get_history') {
    if (!activityLogEntity) {
      returnType = 'void';
      params = '';
      annotations = [];
      body = '';
    } else {
      const logCamel = activityLogEntity.nameCamel;
      returnType = `CursorPageDTO<${activityLogEntity.namePascal}DTO>`;
      params = `${pkJavaType} id, @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit, @RequestParam(required = false) String cursor`;
      annotations = ['@Transactional(readOnly = true)'];
      body = `if (!${entity.nameCamel}Repository.existsById(id)) { throw new RuntimeException("${entity.namePascal} not found: " + id); }\n` +
             `        int pageSize = Math.min(limit, 100);\n` +
             `        List<${activityLogEntity.namePascal}> logs;\n` +
             `        boolean hasMore;\n\n` +
             `        if (cursor == null || cursor.isBlank()) {\n` +
             `          Pageable pageable = PageRequest.of(0, pageSize + 1, Sort.by(Sort.Direction.DESC, "createdAt", "id"));\n` +
             `          logs = ${logCamel}Repository.findByTicketIdOrderByCreatedAtDesc(id, pageable).getContent();\n` +
             `        } else {\n` +
             `          try {\n` +
             `            String decoded = new String(java.util.Base64.getUrlDecoder().decode(cursor), java.nio.charset.StandardCharsets.UTF_8);\n` +
             `            String[] parts = decoded.split(":", 2);\n` +
             `            if (parts.length != 2) throw new IllegalArgumentException("Invalid cursor format");\n` +
             `            java.time.LocalDateTime cursorCreatedAt = java.time.LocalDateTime.ofInstant(\n` +
             `              java.time.Instant.ofEpochMilli(Long.parseLong(parts[0])), java.time.ZoneOffset.UTC);\n` +
             `            String cursorId = parts[1];\n` +
             `            Pageable pageable = PageRequest.of(0, pageSize + 1);\n` +
             `            logs = ${logCamel}Repository.findByTicketIdAfterCursor(id, cursorCreatedAt, cursorId, pageable);\n` +
             `          } catch (Exception e) {\n` +
             `            throw new org.springframework.web.server.ResponseStatusException(\n` +
             `              org.springframework.http.HttpStatus.BAD_REQUEST, "Invalid cursor: " + cursor);\n` +
             `          }\n` +
             `        }\n\n` +
             `        hasMore = logs.size() > pageSize;\n` +
             `        if (hasMore) logs = logs.subList(0, pageSize);\n\n` +
             `        String nextCursor = null;\n` +
             `        if (!logs.isEmpty()) {\n` +
             `          ${activityLogEntity.namePascal} last = logs.get(logs.size() - 1);\n` +
             `          String raw = last.getCreatedAt().toInstant(java.time.ZoneOffset.UTC).toEpochMilli() + ":" + last.getId();\n` +
             `          nextCursor = java.util.Base64.getUrlEncoder().encodeToString(raw.getBytes(java.nio.charset.StandardCharsets.UTF_8));\n` +
             `        }\n\n` +
             `        List<${activityLogEntity.namePascal}DTO> items = logs.stream()\n` +
             `          .map(${logCamel}Mapper::toDTO)\n` +
             `          .toList();\n\n` +
             `        return new CursorPageDTO<>(items, nextCursor, hasMore);`;
    }
  } else {
    returnType = 'void';
    params = '';
    annotations = [];
    body = '';
  }

  return {
    name,
    returnType,
    params,
    body,
    annotations,
    hasRules,
    ruleChecks,
    transitionGuard,
    eventPublishCalls: eventCalls,
  };
}

function buildTransitionGuard(entity: EntityDef): string {
  const e = entity.nameCamel;
  return `if (!VALID_TRANSITIONS.get(${e}.getStatus().name()).contains(status)) {\n          throw new RuntimeException("Invalid transition from " + ${e}.getStatus().name() + " to " + status);\n        }`;
}

function buildRuleCheckBody(
  ruleChecks: SpringRuleCheck[],
  entity: EntityDef,
  action?: string,
): string {
  if (ruleChecks.length === 0) return '';
  const attrNames = new Set(entity.attributes.map((a) => a.name));
  const relNames = new Set(entity.relationships.map((r) => r.name));
  const allMemberNames = new Set([...attrNames, ...relNames]);
  return ruleChecks
    .map((r) => {
      let condition = r.guardJava
        .replace(/\bentity\./g, `${entity.nameCamel}.`)
        .replace(/\bnewStatus\b/g, 'status')
        .replace(/\bnewPriority\b/g, 'priority')
        .replace(/!==/g, '!=')
        .replace(/===/g, '==')
        .replace(/'/g, '"');
      // Convert string comparisons from reference equality to value equality
      condition = condition.replace(/([\w.()]+)\s*!=\s*"([^"]+)"/g, '!"$2".equals($1)');
      condition = condition.replace(/([\w.()]+)\s*==\s*"([^"]+)"/g, '"$2".equals($1)');
      if (action === 'create') {
        for (const attrName of attrNames) {
          const barePattern = new RegExp(`\\b${attrName}\\b(?!\\s*\\()`, 'g');
          condition = condition.replace(
            barePattern,
            `${entity.nameCamel}.get${attrName.charAt(0).toUpperCase() + attrName.slice(1)}()`,
          );
        }
      }
      condition = condition.replace(/\b(\w+)\.(\w+)\b/g, (match, obj, prop) => {
        if (!allMemberNames.has(prop)) return match;
        const getter = `${obj}.get${prop.charAt(0).toUpperCase() + prop.slice(1)}()`;
        return getter;
      });
      for (const relName of relNames) {
        const pascal = relName.charAt(0).toUpperCase() + relName.slice(1);
        condition = condition.replace(
          new RegExp(`\\.get${pascal}\\(\\)\\.length\\b`, 'g'),
          `.get${pascal}().size()`,
        );
      }
      condition = condition.replace(/\.length\b(?!\s*\()/g, '.length()');
      // Append .name() for enum attribute getters in guard expressions
      for (const attr of entity.attributes.filter((a) => a.isEnum && !a.primary)) {
        const getterName = `get${attr.name.charAt(0).toUpperCase() + attr.name.slice(1)}`;
        condition = condition.replace(
          new RegExp(`\\.${getterName}\\(\\)(?!\\.)`, 'g'),
          `.${getterName}().name()`,
        );
      }
      return `if (!(${condition})) { throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "${r.message}"); }`;
    })
    .join('\n        ');
}

function buildEventPublishBody(ir: IR, entity: EntityDef, action: string): string {
  const events = ir.events ?? [];
  const actionSuffixMap: Record<string, string> = {
    create: 'Creado',
    assign_user: 'Asignado',
    update_status: 'Cerrado',
    update_priority: 'Modificado',
    unassign_user: 'Desasignado',
  };
  const suffix = actionSuffixMap[action];
  if (!suffix) return '';
  const matching = events.filter((ev) => ev.namePascal.endsWith(suffix));
  if (matching.length === 0) return '';
  return matching
    .map((ev) => `${ev.nameCamel}EventPublisher.publish(old${entity.namePascal}, ${entity.nameCamel}, actor);`)
    .join('\n        ');
}

function buildManyToOneResolutionBody(
  entity: EntityDef,
  _ir: IR,
  dtoVar: string,
  entityVar: string,
): string {
  const mtoRels = entity.relationships.filter((r) => r.type === 'many_to_one');
  if (mtoRels.length === 0) return '';

  const blocks: string[] = [];
  for (const rel of mtoRels) {
    const fk = rel.foreignKey;
    const fkGetter = `get${fk.charAt(0).toUpperCase() + fk.slice(1)}`;
    const targetCamel = rel.target.charAt(0).toLowerCase() + rel.target.slice(1);
    const setter = `set${rel.namePascal.charAt(0).toUpperCase() + rel.namePascal.slice(1)}`;

    blocks.push(
      `if (${dtoVar}.${fkGetter}() != null) {`,
      `    ${entityVar}.${setter}(${targetCamel}Repository.getReferenceById(${dtoVar}.${fkGetter}()));`,
      '}',
    );
  }

  return blocks.join('\n        ');
}

function buildEndpoints(entity: EntityDef, ir: IR): SpringEndpoint[] {
  const commentEntity = findCommentEntity(entity, ir);
  const activityLogEntity = findActivityLogEntity(entity, ir);
  return entity.useCases.map((uc) => {
    const pkJavaType = mapToJavaType(entity.primaryKey?.type ?? 'String');
    const needsMap =
      (uc.needsPayload && !(uc.name === 'create' || categoryIsCreate(uc))) ||
      uc.name === 'add_comment';

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
      body = `return ResponseEntity.ok(${entity.nameCamel}Service.${uc.methodName}());`;
    } else if (uc.name === 'get_by_id') {
      body = `return ResponseEntity.ok(${entity.nameCamel}Service.${uc.methodName}(id));`;
    } else if (uc.name === 'add_comment' && commentEntity) {
      returnType = `${commentEntity.namePascal}DTO`;
      params = `@PathVariable ${pkJavaType} id, @RequestBody java.util.Map<String, String> body`;
      body = `return ResponseEntity.ok(${entity.nameCamel}Service.${uc.methodName}(id, body.get("text")));`;
    } else if (uc.name === 'add_comment') {
      // Fallback for entity that IS the comment (no foreign entity)
      params = `@PathVariable ${pkJavaType} id, @RequestBody java.util.Map<String, String> body`;
      body = `return ResponseEntity.ok(${entity.nameCamel}Service.${uc.methodName}(id, body.get("text")));`;
    } else if (uc.name === 'create' || categoryIsCreate(uc)) {
      params = `@RequestBody ${entity.namePascal}DTO dto`;
      body = `return ResponseEntity.ok(${entity.nameCamel}Service.${uc.methodName}(dto));`;
    } else if (uc.name === 'get_history') {
      if (!activityLogEntity) {
        returnType = `${entity.namePascal}DTO`;
        params = `@PathVariable ${pkJavaType} id`;
        body = '';
      } else {
        returnType = `CursorPageDTO<${activityLogEntity.namePascal}DTO>`;
        params = `@PathVariable ${pkJavaType} id, @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit, @RequestParam(required = false) String cursor`;
        body = `return ResponseEntity.ok(${entity.nameCamel}Service.${uc.methodName}(id, limit, cursor));`;
      }
    }

    return {
      httpMethod: uc.httpMethod,
      annotation,
      path: uc.pathSuffix,
      returnType,
      params,
      body,
      needsMap,
    };
  });
}

function categoryIsCreate(uc: UseCaseDef): boolean {
  return uc.name === 'create' || (uc.httpMethod === 'POST' && !uc.needsId && uc.needsPayload);
}

function buildRepositoryMethods(entity: EntityDef): SpringRepositoryMethod[] {
  const methods: SpringRepositoryMethod[] = [];
  if (entity.useCases.some((uc) => uc.name === 'get_all')) {
    methods.push({
      name: 'findAllByOrderByCreatedAtDesc',
      signature: `List<${entity.namePascal}> findAllByOrderByCreatedAtDesc()`,
      isCustom: false,
    });
  }
  if (entity.useCases.some((uc) => uc.name === 'get_history')) {
    methods.push({
      name: 'findByTicketIdOrderByCreatedAtDesc',
      signature: `org.springframework.data.domain.Page<${entity.namePascal}> findByTicketIdOrderByCreatedAtDesc(String ticketId, org.springframework.data.domain.Pageable pageable)`,
      isCustom: false,
    });
    methods.push({
      name: 'findByTicketIdAfterCursor',
      signature: `java.util.List<${entity.namePascal}> findByTicketIdAfterCursor(String ticketId, java.time.LocalDateTime cursorCreatedAt, String cursorId, org.springframework.data.domain.Pageable pageable)`,
      isCustom: true,
    });
  }
  return methods;
}

function buildSpringRuleChecks(entity: EntityDef): SpringRuleCheck[] {
  return (entity.entityRules ?? []).map((r) => ({
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
    domain: ir.entities
      .filter((e: EntityDef) => e.name !== entity.name)
      .map((e: EntityDef) => e.namePascal),
    spring: [],
  };
}

function buildEventPublishers(ir: IR, entity: EntityDef): SpringEventPublisher[] {
  const events = ir.events ?? [];
  return events
    .filter((ev) => ev.source === entity.name || ev.namePascal.startsWith(entity.namePascal))
    .map((ev) => ({
      name: ev.name,
      eventClass: `${ev.namePascal}Event`,
      eventName: ev.nameCamel,
      trackedFields: ev.trackedFields,
    }));
}

function buildSeedData(_ir: IR): SpringSeedData | undefined {
  return undefined;
}

function buildGlobalImports(_ir: IR): string[] {
  return [];
}
