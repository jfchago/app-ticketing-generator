import { describe, it, expect, beforeEach } from "vitest";
import {
  registerMigration,
  migrateSpec,
  isMigrationIdempotent,
  listRegisteredMigrations,
  clearRegistry,
} from "../migrator.js";
import type { MigrationStep } from "../types.js";

const V1 = { major: 1, minor: 0, patch: 0 };
const V2 = { major: 2, minor: 0, patch: 0 };
const V3 = { major: 3, minor: 0, patch: 0 };

function makeStep(from: typeof V1, to: typeof V1, label: string, transform: (s: unknown) => unknown): MigrationStep {
  return {
    from,
    to,
    label,
    applicable: () => true,
    apply: transform,
  };
}

describe("registerMigration", () => {
  beforeEach(() => {
    clearRegistry();
  });

  it("registers a migration step", () => {
    registerMigration(makeStep(V1, V2, "v1→v2: add tags", (s) => {
      const spec = s as Record<string, unknown>;
      return { ...spec, tags: ["added"] };
    }));
    expect(listRegisteredMigrations()).toHaveLength(1);
  });

  it("replaces duplicate registration", () => {
    registerMigration(makeStep(V1, V2, "v1→v2: first", (s) => s));
    registerMigration(makeStep(V1, V2, "v1→v2: second", (s) => s));
    expect(listRegisteredMigrations()).toHaveLength(1);
    expect(listRegisteredMigrations()[0].label).toBe("v1→v2: second");
  });
});

describe("migrateSpec", () => {
  beforeEach(() => {
    clearRegistry();
  });

  it("returns same spec when versions match", () => {
    const spec = { version: "1.0.0", application: { name: "Test", module: "test" }, entities: [] };
    const result = migrateSpec(spec, V1, V1);
    expect(result.spec).toEqual(spec);
    expect(result.migrationPath).toEqual([]);
  });

  it("applies single migration", () => {
    registerMigration(makeStep(V1, V2, "v1→v2: add tags", (s) => {
      const spec = s as Record<string, unknown>;
      return { ...spec, tags: ["added"] };
    }));
    const spec = { version: "1.0.0", application: { name: "Test", module: "test" }, entities: [] };
    const result = migrateSpec(spec, V1, V2);
    expect((result.spec as Record<string, unknown>)["tags"]).toEqual(["added"]);
    expect(result.migrationPath).toEqual(["v1→v2: add tags"]);
  });

  it("chains multiple migrations", () => {
    registerMigration(makeStep(V1, V2, "v1→v2: add key", (s) => {
      const spec = s as Record<string, unknown>;
      return { ...spec, step1: true };
    }));
    registerMigration(makeStep(V2, V3, "v2→v3: add key", (s) => {
      const spec = s as Record<string, unknown>;
      return { ...spec, step2: true };
    }));
    const spec = { version: "1.0.0", application: { name: "Test", module: "test" }, entities: [] };
    const result = migrateSpec(spec, V1, V3);
    expect((result.spec as Record<string, unknown>)["step1"]).toBe(true);
    expect((result.spec as Record<string, unknown>)["step2"]).toBe(true);
    expect(result.migrationPath).toHaveLength(2);
  });

  it("skips inapplicable migrations", () => {
    registerMigration({
      from: V1,
      to: V2,
      label: "v1→v2: skip",
      applicable: () => false,
      apply: (s) => s,
    });
    const spec = { version: "1.0.0", application: { name: "Test", module: "test" }, entities: [] };
    const result = migrateSpec(spec, V1, V2);
    expect(result.migrationPath).toEqual(["no-migration-needed::2.0.0"]);
  });

  it("returns no-migration-needed when upgrading without registered steps", () => {
    const spec = { version: "1.0.0", application: { name: "Test", module: "test" }, entities: [] };
    const result = migrateSpec(spec, V1, V2);
    expect(result.migrationPath).toContain("no-migration-needed::2.0.0");
  });
});

describe("isMigrationIdempotent", () => {
  beforeEach(() => {
    clearRegistry();
  });

  it("returns true for idempotent migration", () => {
    registerMigration(makeStep(V1, V2, "v1→v2: idempotent", (s) => {
      const spec = s as Record<string, unknown>;
      if (spec["migrated"]) return spec;
      return { ...spec, migrated: true };
    }));
    const spec = { version: "1.0.0", application: { name: "Test", module: "test" }, entities: [] };
    expect(isMigrationIdempotent("v1→v2: idempotent", spec)).toBe(true);
  });

  it("returns false for non-idempotent migration", () => {
    let counter = 0;
    registerMigration(makeStep(V1, V2, "v1→v2: counter", (s) => {
      counter++;
      return { ...(s as Record<string, unknown>), counter };
    }));
    const spec = { version: "1.0.0", application: { name: "Test", module: "test" }, entities: [] };
    expect(isMigrationIdempotent("v1→v2: counter", spec)).toBe(false);
  });

  it("returns true for unknown label", () => {
    expect(isMigrationIdempotent("nonexistent", {})).toBe(true);
  });
});
