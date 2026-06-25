// compilation-validation.test.ts — Integration test: generated code compiles
import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SPEC_PATH = path.join(REPO_ROOT, 'specs', 'helpdesk.yaml');
const CLI_TS = path.join(REPO_ROOT, 'src', 'cli.ts');
const VUE_POC = path.resolve(REPO_ROOT, '..', 'vue-poc-agents');

function runGenerator(target: string, outputDir: string): void {
  execSync(`npx tsx "${CLI_TS}" generate -s "${SPEC_PATH}" -t "${target}" -o "${outputDir}"`, {
    cwd: REPO_ROOT,
    stdio: 'pipe',
    timeout: 120_000,
  });
}

const VUE_HAND_AUTHORED_FILES = [
  'package.json',
  'vite.config.ts',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'index.html',
];

function copyVueHandAuthoredFiles(targetDir: string): void {
  for (const file of VUE_HAND_AUTHORED_FILES) {
    const src = path.join(VUE_POC, file);
    const dest = path.join(targetDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  }
}

const TIMEOUT = 180_000;
const SKIP_COMPILATION = process.env.RUN_COMPILATION_TESTS !== 'true';

describe('Generated code compilation validation', () => {
  let tmpDir: string;
  let springOut: string;
  let vueOut: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencode-gen-test-'));
    springOut = path.join(tmpDir, 'spring');
    vueOut = path.join(tmpDir, 'vue');
  }, TIMEOUT);

  describe('Spring backend', () => {
    it(
      'regenerates Spring backend without error',
      () => {
        runGenerator('spring', springOut);
        const serviceFile = path.join(
          springOut,
          'src',
          'main',
          'java',
          'com',
          'helpdesk',
          'service',
          'TicketService.java',
        );
        expect(fs.existsSync(serviceFile)).toBe(true);
      },
      TIMEOUT,
    );

    it('compiles with mvn compile', { skip: SKIP_COMPILATION, timeout: TIMEOUT }, () => {
      execSync('mvn compile -q', {
        cwd: springOut,
        stdio: 'pipe',
        timeout: TIMEOUT,
      });
    });
  });

  describe('Vue frontend', () => {
    it(
      'regenerates Vue frontend without error',
      () => {
        runGenerator('vue', vueOut);
        const storeFile = path.join(vueOut, 'src', 'stores', 'ticket.store.ts');
        expect(fs.existsSync(storeFile)).toBe(true);
      },
      TIMEOUT,
    );

    it('builds with npm run build', { skip: SKIP_COMPILATION, timeout: TIMEOUT }, () => {
      copyVueHandAuthoredFiles(vueOut);
      execSync('npm install', {
        cwd: vueOut,
        stdio: 'pipe',
        timeout: TIMEOUT,
      });
      execSync('npm run build', {
        cwd: vueOut,
        stdio: 'pipe',
        timeout: TIMEOUT,
      });
    });
  });
});
