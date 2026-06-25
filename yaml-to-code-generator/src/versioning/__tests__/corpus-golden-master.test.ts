import { describe, it, expect } from 'vitest';
import { parseYamlFile } from '../../parser/yaml-parser.js';
import { validateSpec } from '../../validator/schema-validator.js';
import { buildIR } from '../../ir/builder.js';
import { buildSemanticModelOrThrow } from '../../semantic/index.js';
import { canonicalize, versionToString } from '../index.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const _testDir = path.dirname(fileURLToPath(import.meta.url));
const CORPUS_PATH = path.resolve(_testDir, '../../..', 'test/fixtures/corpus/helpdesk-v1.0.yaml');
const IR_GOLDEN = path.resolve(_testDir, '../../..', 'test/fixtures/ir-golden-master.json');
const SEMANTIC_GOLDEN = path.resolve(
  _testDir,
  '../../..',
  'test/fixtures/semantic-golden-master.json',
);
const VUE_GOLDEN_DIR = path.resolve(_testDir, '../../..', 'test/fixtures/vue-golden');
const SPRING_GOLDEN_DIR = path.resolve(_testDir, '../../..', 'test/fixtures/spring-golden');

function collectFiles(dir: string): Map<string, string> {
  const files = new Map<string, string>();
  function walk(d: string) {
    if (!fs.existsSync(d)) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        const rel = path.relative(dir, full);
        files.set(rel, fs.readFileSync(full, 'utf-8'));
      }
    }
  }
  walk(dir);
  return files;
}

function buildFromCorpus() {
  const raw = parseYamlFile(CORPUS_PATH);
  const versioned = canonicalize(raw as Record<string, unknown>);
  const spec = validateSpec(versioned.spec);
  const semantic = buildSemanticModelOrThrow(spec);
  const ir = buildIR(semantic);
  return { raw, versioned, spec, semantic, ir };
}

describe('Corpus Golden Master — Versioned', () => {
  const ctx = buildFromCorpus();

  it('corpus spec has explicit version', () => {
    const raw = ctx.raw as Record<string, unknown>;
    expect(raw['version']).toBe('1.0.0');
  });

  it('canonical version matches corpus version', () => {
    expect(versionToString(ctx.versioned.originalVersion)).toBe('1.0.0');
    expect(versionToString(ctx.versioned.canonicalVersion)).toBe('1.0.0');
    expect(ctx.versioned.migrated).toBe(false);
    expect(ctx.versioned.warnings).toEqual([]);
  });

  it('canonicalized spec has expected structure', () => {
    const cspec = ctx.versioned.spec as Record<string, unknown>;
    expect(cspec['version']).toBe('1.0.0');
    expect(cspec['entities']).toHaveLength(3);
    const enums = cspec['enums'] as Record<string, unknown>;
    expect(Object.keys(enums).sort()).toEqual(['TicketPriority', 'TicketStatus']);
  });

  it('generates same IR structure as canonical spec', () => {
    const ir = ctx.ir;
    expect(ir.entities.length).toBe(3);
    expect(ir.enums.length).toBe(2);
    expect(ir.application.appClassName).toBe('MiniHelpDesk');
    const ticket = ir.entities.find((e) => e.name === 'Ticket');
    expect(ticket).toBeDefined();
    expect(ticket!.attributes.length).toBeGreaterThan(0);
  });

  it('IR snapshot matches golden master', () => {
    if (!fs.existsSync(IR_GOLDEN)) return;
    const golden = JSON.parse(fs.readFileSync(IR_GOLDEN, 'utf-8'));
    expect(golden.summary.entities).toBe(3);
    expect(golden.summary.enums).toBe(2);
    expect(golden.entities).toBeDefined();
    expect(golden.entities.length).toBe(3);
    const ticket = golden.entities.find((e: { name: string }) => e.name === 'Ticket');
    expect(ticket).toBeDefined();
  });

  it('Semantic Model snapshot matches golden master', () => {
    if (!fs.existsSync(SEMANTIC_GOLDEN)) return;
    const golden = JSON.parse(fs.readFileSync(SEMANTIC_GOLDEN, 'utf-8'));
    expect(golden.entities).toBeDefined();
    expect(Array.isArray(golden.entities)).toBe(true);
    const ticket = (golden.entities as any[]).find(
      (e: { name: string }) => e.name === 'Ticket',
    ) as any;
    expect(ticket).toBeDefined();
    expect(ticket!.useCaseCount).toBe(8);
  });

  it('Vue golden master has all expected files', () => {
    if (!fs.existsSync(VUE_GOLDEN_DIR)) return;
    const golden = collectFiles(VUE_GOLDEN_DIR);
    expect(golden.size).toBe(28);
    const paths = [...golden.keys()].map((p) => p.replace(/\\/g, '/')).sort();
    expect(paths).toContain('src/stores/ticket.store.ts');
    expect(paths).toContain('src/domain/ticket/ticket.types.ts');
    expect(paths).toContain('src/domain/enums.ts');
    expect(paths).toContain('src/infrastructure/api-client.ts');
    expect(paths).toContain('src/app/router/index.ts');
  });

  it('Spring golden master has all expected files', () => {
    if (!fs.existsSync(SPRING_GOLDEN_DIR)) return;
    const golden = collectFiles(SPRING_GOLDEN_DIR);
    expect(golden.size).toBeGreaterThanOrEqual(30);
    const paths = [...golden.keys()].map((p) => p.replace(/\\/g, '/')).sort();
    expect(paths.some((p: string) => p.includes('TicketController.java'))).toBe(true);
    expect(paths.some((p: string) => p.includes('TicketService.java'))).toBe(true);
    expect(paths.some((p: string) => p.includes('Ticket.java'))).toBe(true);
    expect(paths.some((p: string) => p.includes('MiniHelpDeskApplication.java'))).toBe(true);
  });

  it('corpus spec round-trips through canonicalize without change', () => {
    const raw = parseYamlFile(CORPUS_PATH);
    const first = canonicalize(raw as Record<string, unknown>);
    const second = canonicalize(first.spec as Record<string, unknown>);
    expect(versionToString(second.originalVersion)).toBe(versionToString(first.canonicalVersion));
    expect(second.spec).toEqual(first.spec);
    expect(second.migrated).toBe(false);
  });
});
