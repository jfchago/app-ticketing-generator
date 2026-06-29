// validator/schema-validator.ts — Zod schemas for structural validation of YAML DSL
// Validates that the YAML has the correct shape before any further processing.
// A failing validation means the YAML is malformed, not that it's semantically wrong.

import { z } from 'zod';

// --- Zod schemas ---

const applicationSchema = z.object({
  name: z.string().min(1, 'application.name is required'),
  module: z.string().min(1, 'application.module is required'),
  description: z.string().optional(),
  basePackage: z.string().optional(),
});

const attributeSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  required: z.boolean().optional().default(true),
  primary: z.boolean().optional().default(false),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
  length: z.number().int().positive().optional(),
  column: z.string().optional(),
  unique: z.boolean().optional().default(false),
  label: z.string().optional(),
});

const cardinality = z.union([z.string(), z.number()]);

const relationshipSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['one_to_one', 'one_to_many', 'many_to_one', 'many_to_many']),
  target: z.string().min(1),
  foreign_key: z.string().min(1),
  source_cardinality: cardinality.optional(),
  target_cardinality: cardinality.optional(),
});

const ruleSchema = z.object({
  name: z.string().min(1),
  on: z.string().min(1),
  guard: z.string().min(1),
  message: z.string().min(1),
});

const transitionsSchema = z.record(z.string().min(1), z.array(z.string().min(1)));

const entitySchema = z.object({
  name: z.string().min(1),
  table: z.string().min(1).optional(),
  description: z.string().optional(),
  stereotype: z.string().optional().default('entity'),
  attributes: z.array(attributeSchema).min(1, 'Each entity must have at least one attribute'),
  relationships: z.array(relationshipSchema).optional().default([]),
  use_cases: z.array(z.string()).optional().default([]),
  transitions: transitionsSchema.optional(),
  rules: z.array(ruleSchema).optional().default([]),
});

const colorSchema = z.object({
  bg: z.string(),
  text: z.string(),
});

const enumSchema = z.object({
  values: z.array(z.string()).min(1),
  labels: z.record(z.string()).optional().default({}),
  colors: z.record(colorSchema).optional().default({}),
});

const specSchema = z.object({
  version: z.string().optional().default('1.0.0'),
  application: applicationSchema,
  enums: z.record(z.string(), enumSchema).optional().default({}),
  entities: z.array(entitySchema).min(1, 'At least one entity is required'),
  workflows: z.array(z.string()).optional().default([]),
  events: z.array(z.string()).optional().default([]),
  decisions: z.array(z.string()).optional().default([]),
  stateMachines: z.array(z.string()).optional().default([]),
});

// --- Export types ---

export type RawSpec = z.input<typeof specSchema>;
export type ValidatedSpec = z.output<typeof specSchema>;
export type ValidatedEntity = z.output<typeof entitySchema>;
export type ValidatedAttribute = z.output<typeof attributeSchema>;
export type ValidatedRelationship = z.output<typeof relationshipSchema>;
export type ValidatedEnum = z.output<typeof enumSchema>;

// --- Validation function ---

export class SchemaValidationError extends Error {
  public readonly details: z.ZodError;

  constructor(zodError: z.ZodError) {
    const flat = zodError.flatten();
    const issues = Object.entries(flat.fieldErrors)
      .map(([field, msgs]) => `  ${field}: ${msgs!.join('; ')}`)
      .join('\n');
    super(`YAML schema validation failed:\n${issues}`);
    this.name = 'SchemaValidationError';
    this.details = zodError;
  }
}

export function validateSpec(raw: unknown): ValidatedSpec {
  const result = specSchema.safeParse(raw);
  if (!result.success) {
    throw new SchemaValidationError(result.error);
  }
  return result.data;
}
