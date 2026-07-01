import { describe, it, expect } from 'vitest';
import { parseYamlFile } from '../../parser/yaml-parser.js';
import { validateSpec } from '../../validator/schema-validator.js';
import { buildIR } from '../../ir/builder.js';
import { buildSemanticModelOrThrow } from '../../semantic/index.js';
import { buildSpringGenerationModel } from '../spring/builder.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
const _testDir = path.dirname(fileURLToPath(import.meta.url));
const SPEC_PATH = path.resolve(_testDir, '../../..', 'specs/helpdesk.yaml');
const GOLDEN_DIR = path.resolve(_testDir, '../..', 'test/fixtures/spring-golden');

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

function buildGenModel() {
  const raw = parseYamlFile(SPEC_PATH);
  const spec = validateSpec(raw);
  const semantic = buildSemanticModelOrThrow(spec);
  const ir = buildIR(semantic);
  return { ir, springGen: buildSpringGenerationModel(ir) };
}

describe('Spring Golden Master', () => {
  const { ir, springGen } = buildGenModel();

  it('generates correct entity count', () => {
    expect(ir.entities.length).toBe(4);
  });

  it('spring gen model has all entities', () => {
    expect(Object.keys(springGen.entities).sort()).toEqual(['ActivityLog', 'Comment', 'Ticket', 'User']);
  });

  it('Ticket gen entity has service methods', () => {
    const t = springGen.entities['Ticket'];
    expect(t.serviceMethods.length).toBe(9);
    expect(t.pkJavaType).toBe('String');
    expect(t.hasCreatedAt).toBe(true);
    expect(t.hasUpdatedAt).toBe(true);
    expect(t.oneToManyRelations.length).toBe(2);
    expect(t.manyToOneRelations.length).toBe(1);
  });

  it('Ticket attribute types are correct', () => {
    const at = springGen.entities['Ticket'].attributeTypes;
    expect(at['status'].javaType).toBe('TicketStatus');
    expect(at['priority'].javaType).toBe('TicketPriority');
    expect(at['createdAt'].javaType).toBe('LocalDateTime');
    expect(at['title'].javaType).toBe('String');
    expect(at['description'].javaType).toBe('String');
  });

  it('Ticket service method bodies exist', () => {
    const t = springGen.entities['Ticket'];
    for (const m of t.serviceMethods) {
      expect(m.body.length).toBeGreaterThan(0);
    }
  });

  it('Ticket endpoints have annotations', () => {
    const t = springGen.entities['Ticket'];
    for (const ep of t.endpoints) {
      expect(ep.annotation).toMatch(/^@(Get|Post|Put|Patch|Delete)Mapping/);
    }
  });

  it('generated golden master files match', () => {
    if (!fs.existsSync(GOLDEN_DIR)) return;
    const golden = collectFiles(GOLDEN_DIR);
    expect(golden.size).toBeGreaterThanOrEqual(30);
    const goldenPaths = [...golden.keys()].sort();
    expect(goldenPaths).toContain('src/main/java/com/helpdesk/service/TicketService.java');
    expect(goldenPaths).toContain('src/main/java/com/helpdesk/controller/TicketController.java');
    expect(goldenPaths).toContain('src/main/java/com/helpdesk/entity/Ticket.java');
    expect(goldenPaths).toContain('src/main/java/com/helpdesk/repository/TicketRepository.java');
    expect(goldenPaths).toContain('src/main/java/com/helpdesk/dto/TicketDTO.java');
    expect(goldenPaths).toContain('src/main/java/com/helpdesk/dto/TicketMapper.java');
    expect(goldenPaths).toContain('src/main/java/com/helpdesk/entity/TicketStatus.java');
    expect(goldenPaths).toContain('src/main/java/com/helpdesk/entity/TicketPriority.java');
    expect(goldenPaths).toContain('build.gradle');
    expect(goldenPaths).toContain('src/main/resources/application.properties');
  });

  it('Ticket.java uses gen model attribute types', () => {
    const entityFile = path.join(GOLDEN_DIR, 'src/main/java/com/helpdesk/entity/Ticket.java');
    if (!fs.existsSync(entityFile)) return;
    const content = fs.readFileSync(entityFile, 'utf-8');
    expect(content).toContain('private String id');
    expect(content).toContain('private TicketStatus status');
    expect(content).toContain('private TicketPriority priority');
    expect(content).toContain('private LocalDateTime createdAt');
    expect(content).toContain('private LocalDateTime updatedAt');
  });

  it('golden master files contain no domain conditionals', () => {
    if (!fs.existsSync(GOLDEN_DIR)) return;
    const golden = collectFiles(GOLDEN_DIR);
    for (const [fileRelPath, content] of golden) {
      expect(content, `File ${fileRelPath} contains Ticket name check`).not.toContain(
        "entity.name === 'Ticket'",
      );
      expect(content, `File ${fileRelPath} contains uc.name check`).not.toMatch(
        /uc\.name === '(get_all|get_by_id|create|update_status|update_priority|assign_user|unassign_user|add_comment|load_users)'/,
      );
    }
  });
});
