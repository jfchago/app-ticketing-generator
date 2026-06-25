// generation/spring/types.ts — Spring Generation Model types
// Projection of IR into Spring Boot/Java-specific rendering data.
// Templates consume this instead of computing from raw IR.

import type { GeneratedEntity, GeneratedEnum, GenerationModel } from '../common.js';

export interface SpringGenerationModel extends GenerationModel {
  entities: { [name: string]: SpringGeneratedEntity };
  enums: SpringGeneratedEnum[];
  /** Global imports shared across all files */
  globalImports: string[];
  /** Pre-computed seed data */
  seedData?: SpringSeedData;
}

export interface SpringGeneratedEntity extends GeneratedEntity {
  /** Java package path (from basePackage) */
  packagePath: string;
  /** Primary key Java type (Long, String, Integer) */
  pkJavaType: string;
  /** Java type per attribute */
  attributeTypes: { [name: string]: SpringAttributeType };
  /** Resolved Java imports */
  imports: SpringImports;
  /** Pre-computed service methods */
  serviceMethods: SpringServiceMethod[];
  /** Pre-computed controller endpoints */
  endpoints: SpringEndpoint[];
  /** Pre-computed repository methods */
  repositoryMethods: SpringRepositoryMethod[];
  /** Pre-computed transition table */
  transitions: Record<string, string[]>;
  /** Pre-computed rule checks */
  ruleChecks: SpringRuleCheck[];
  /** Whether entity has timestamp fields */
  hasCreatedAt: boolean;
  hasUpdatedAt: boolean;
  /** Relationships by type */
  oneToManyRelations: SpringRelationship[];
  manyToOneRelations: SpringRelationship[];
  /** Whether entity emits/publishes events */
  emitsEvents: boolean;
  /** Event publisher names */
  eventPublishers: SpringEventPublisher[];
}

export interface SpringAttributeType {
  javaType: string;
  needsImport: boolean;
  importPath: string;
  isEnum: boolean;
  isPrimitive: boolean;
  jpaAnnotation: string;
}

export interface SpringImports {
  standard: string[];
  domain: string[];
  spring: string[];
}

export interface SpringServiceMethod {
  name: string;
  returnType: string;
  params: string;
  body: string;
  annotations: string[];
  /** Whether this method runs business rule checks */
  hasRules: boolean;
  /** Rule checks for this method */
  ruleChecks: SpringRuleCheck[];
  /** Transition guard for this method */
  transitionGuard?: string;
  /** Event publish calls */
  eventPublishCalls: string[];
}

export interface SpringEndpoint {
  httpMethod: string;
  annotation: string;
  path: string;
  returnType: string;
  params: string;
  body: string;
  needsMap: boolean;
}

export interface SpringRepositoryMethod {
  name: string;
  signature: string;
  isCustom: boolean;
}

export interface SpringRuleCheck {
  nameCamel: string;
  namePascal: string;
  guardJava: string;
  message: string;
  on: string;
}

export interface SpringRelationship {
  name: string;
  namePascal: string;
  target: string;
  targetPascal: string;
  foreignKey: string;
}

export interface SpringEventPublisher {
  name: string;
  eventClass: string;
  eventName: string;
}

export interface SpringSeedData {
  users: SpringSeedEntity[];
  tickets: SpringSeedEntity[];
  comments: SpringSeedEntity[];
}

export interface SpringSeedEntity {
  type: string;
  fields: { name: string; value: string }[];
}

export interface SpringGeneratedEnum extends GeneratedEnum {
  values: { name: string; label: string }[];
}
