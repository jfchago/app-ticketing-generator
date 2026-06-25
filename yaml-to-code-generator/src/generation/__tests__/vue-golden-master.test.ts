import { describe, it, expect } from 'vitest';
import { parseYamlFile } from '../../parser/yaml-parser.js';
import { validateSpec } from '../../validator/schema-validator.js';
import { buildIR } from '../../ir/builder.js';
import { buildSemanticModelOrThrow } from '../../semantic/index.js';
import { buildVueGenerationModel } from '../vue/builder.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
const _testDir = path.dirname(fileURLToPath(import.meta.url));
const SPEC_PATH = path.resolve(_testDir, '../../..', 'specs/helpdesk.yaml');
const GOLDEN_DIR = path.resolve(_testDir, '../..', 'test/fixtures/vue-golden');

function collectFiles(dir: string): Map<string, string> {
  const files = new Map<string, string>();
  function walk(d: string) {
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
  return { ir, vueGen: buildVueGenerationModel(ir) };
}

describe('Vue Golden Master', () => {
  const { ir, vueGen } = buildGenModel();

  it('generates correct entity count', () => {
    expect(ir.entities.length).toBe(3);
  });

  it('vue gen model has all entities', () => {
    expect(Object.keys(vueGen.entities).sort()).toEqual(['Comment', 'Ticket', 'User']);
  });

  it('Ticket gen entity has state properties', () => {
    const t = vueGen.entities['Ticket'];
    expect(t.statePropertyName).toBe('tickets');
    expect(t.selectedPropertyName).toBe('current');
    expect(t.hasCommentSupport).toBe(true);
    expect(t.hasAssignee).toBe(true);
  });

  it('all store actions have correct names', () => {
    const ticketActions = vueGen.entities['Ticket'].storeActions;
    const names = ticketActions.map(a => a.name).sort();
    expect(names).toEqual([
      'addComment', 'assignUser', 'create', 'getAll', 'getById',
      'unassignUser', 'updatePriority', 'updateStatus'
    ]);
  });

  it('all form fields have input types', () => {
    const ticketForm = vueGen.entities['Ticket'].formFields;
    expect(ticketForm.length).toBeGreaterThan(0);
    for (const f of ticketForm) {
      expect(['text', 'textarea', 'select', 'number']).toContain(f.inputType);
    }
  });

  it('generated golden master files match', () => {
    if (!fs.existsSync(GOLDEN_DIR)) return;
    const golden = collectFiles(GOLDEN_DIR);
    expect(golden.size).toBe(28);
    const goldenPaths = [...golden.keys()].sort();
    expect(goldenPaths).toContain('src/stores/ticket.store.ts');
    expect(goldenPaths).toContain('src/domain/ticket/ticket.types.ts');
    expect(goldenPaths).toContain('src/domain/ticket/ticket.repository.ts');
    expect(goldenPaths).toContain('src/domain/ticket/ticket.service.ts');
    expect(goldenPaths).toContain('src/infrastructure/repositories/ticket.repository.impl.ts');
    expect(goldenPaths).toContain('src/components/TicketCard.vue');
    expect(goldenPaths).toContain('src/views/TicketListView.vue');
    expect(goldenPaths).toContain('src/views/TicketDetailView.vue');
    expect(goldenPaths).toContain('src/views/CreateTicketView.vue');
    expect(goldenPaths).toContain('src/domain/enums.ts');
    expect(goldenPaths).toContain('src/infrastructure/api-client.ts');
    expect(goldenPaths).toContain('src/app/router/index.ts');
  });

  it('ticket store uses gen model naming', () => {
    const storeFile = path.join(GOLDEN_DIR, 'src/stores/ticket.store.ts');
    if (!fs.existsSync(storeFile)) return;
    const content = fs.readFileSync(storeFile, 'utf-8');
    expect(content).toContain('getAll()');
    expect(content).toContain('getById(');
    expect(content).toContain('create(');
    expect(content).toContain('tickets');
    expect(content).toContain('current');
    expect(content).not.toContain('loadTickets');
    expect(content).not.toContain('selectedTicket');
  });

  it('golden master files contain no domain conditionals', () => {
    if (!fs.existsSync(GOLDEN_DIR)) return;
    const golden = collectFiles(GOLDEN_DIR);
    for (const [fileRelPath, content] of golden) {
      expect(content, `File ${fileRelPath} contains domain conditional`).not.toContain("entity.name === 'Ticket'");
      expect(content, `File ${fileRelPath} contains domain conditional`).not.toContain("uc.name === 'get_all'");
      expect(content, `File ${fileRelPath} contains domain conditional`).not.toContain("uc.name === 'get_by_id'");
      expect(content, `File ${fileRelPath} contains domain conditional`).not.toContain("uc.name === 'create'");
      expect(content, `File ${fileRelPath} contains domain conditional`).not.toContain("uc.name === 'update_status'");
      expect(content, `File ${fileRelPath} contains domain conditional`).not.toContain("uc.name === 'update_priority'");
      expect(content, `File ${fileRelPath} contains domain conditional`).not.toContain("uc.name === 'assign_user'");
      expect(content, `File ${fileRelPath} contains domain conditional`).not.toContain("uc.name === 'unassign_user'");
      expect(content, `File ${fileRelPath} contains domain conditional`).not.toContain("uc.name === 'add_comment'");
      expect(content, `File ${fileRelPath} contains domain conditional`).not.toContain("uc.name === 'load_users'");
    }
  });
});
