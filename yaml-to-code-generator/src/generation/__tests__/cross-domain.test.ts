import { describe, it, expect } from 'vitest';
import { parseYamlFile } from '../../parser/yaml-parser.js';
import { validateSpec } from '../../validator/schema-validator.js';
import { buildIR } from '../../ir/builder.js';
import { buildSemanticModelOrThrow } from '../../semantic/index.js';
import { buildVueGenerationModel } from '../vue/builder.js';
import { buildSpringGenerationModel } from '../spring/builder.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const _testDir = path.dirname(fileURLToPath(import.meta.url));
const HELPDESK_PATH = path.resolve(_testDir, '../../..', 'specs/helpdesk.yaml');
const INVENTORY_PATH = path.resolve(_testDir, '../../..', 'specs/inventory.yaml');

function buildModels(specPath: string) {
  const raw = parseYamlFile(specPath);
  const spec = validateSpec(raw);
  const semantic = buildSemanticModelOrThrow(spec);
  const ir = buildIR(semantic);
  const vueGen = buildVueGenerationModel(ir);
  const springGen = buildSpringGenerationModel(ir);
  return { ir, vueGen, springGen };
}

describe('Cross-domain generation', () => {
  const hasInventorySpec = fs.existsSync(INVENTORY_PATH);

  it('helpdesk spec produces valid models with 4 entities', () => {
    const { ir, vueGen, springGen } = buildModels(HELPDESK_PATH);
    expect(ir.entities.length).toBe(4);
    expect(Object.keys(vueGen.entities).length).toBe(4);
    expect(Object.keys(springGen.entities).length).toBe(4);
  });

  it('inventory spec produces valid models with 2 entities and no errors', () => {
    if (!hasInventorySpec) return;
    const { ir, vueGen, springGen } = buildModels(INVENTORY_PATH);
    expect(ir.entities.length).toBe(2);
    expect(Object.keys(vueGen.entities).length).toBe(2);
    expect(Object.keys(springGen.entities).length).toBe(2);
  });

  it('inventory Vue model has Product entity with correct properties', () => {
    if (!hasInventorySpec) return;
    const { vueGen } = buildModels(INVENTORY_PATH);
    const product = vueGen.entities['Product'];
    expect(product).toBeDefined();
    expect(product.hasCreate).toBe(true);
    expect(product.hasGetAll).toBe(true);
    expect(product.hasGetById).toBe(true);
    expect(product.storeActions.length).toBeGreaterThan(0);
    expect(product.formFields.length).toBeGreaterThan(0);
  });

  it('inventory Spring model has Product service methods', () => {
    if (!hasInventorySpec) return;
    const { springGen } = buildModels(INVENTORY_PATH);
    const product = springGen.entities['Product'];
    expect(product.serviceMethods.length).toBeGreaterThanOrEqual(5);
    const names = product.serviceMethods.map((m) => m.name);
    expect(names).toContain('getAll');
    expect(names).toContain('getById');
    expect(names).toContain('create');
    expect(names).toContain('update');
    expect(names).toContain('delete');
  });
});
