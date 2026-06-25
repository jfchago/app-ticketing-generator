import type { DslVersion, MigrationStep } from './types.js';
import { versionToString, compareVersions, versionsEqual } from './resolver.js';

const REGISTRY: MigrationStep[] = [];

export function registerMigration(step: MigrationStep): void {
  const idx = REGISTRY.findIndex(
    (s) => versionsEqual(s.from, step.from) && versionsEqual(s.to, step.to),
  );
  if (idx !== -1) {
    REGISTRY[idx] = step;
  } else {
    REGISTRY.push(step);
  }
}

export function getMigrationSteps(from: DslVersion, to: DslVersion): MigrationStep[] {
  const sorted = [...REGISTRY].sort(
    (a, b) => compareVersions(a.from, b.from) - compareVersions(a.to, b.to),
  );

  const relevant: MigrationStep[] = [];

  for (const step of sorted) {
    if (compareVersions(step.from, from) >= 0 && compareVersions(step.to, to) <= 0) {
      relevant.push(step);
    }
  }

  return relevant;
}

export interface MigrationResult {
  spec: unknown;
  migrationPath: string[];
}

export function migrateSpec(
  spec: unknown,
  fromVersion: DslVersion,
  toVersion: DslVersion,
): MigrationResult {
  const targetStr = versionToString(toVersion);
  const steps = getMigrationSteps(fromVersion, toVersion);

  let current = spec;
  const path: string[] = [];

  for (const step of steps) {
    if (step.applicable(current)) {
      current = step.apply(current);
      path.push(step.label);
    }
  }

  if (compareVersions(fromVersion, toVersion) < 0 && path.length === 0) {
    path.push(`no-migration-needed::${targetStr}`);
  }

  return { spec: current, migrationPath: path };
}

export function isMigrationIdempotent(label: string, testSpec: unknown): boolean {
  const step = REGISTRY.find((s) => s.label === label);
  if (!step) return true;

  const first = step.apply(structuredClone(testSpec));
  const second = step.apply(structuredClone(first));
  try {
    return JSON.stringify(first) === JSON.stringify(second);
  } catch {
    return false;
  }
}

export function listRegisteredMigrations(): MigrationStep[] {
  return [...REGISTRY];
}

export function clearRegistry(): void {
  REGISTRY.length = 0;
}
