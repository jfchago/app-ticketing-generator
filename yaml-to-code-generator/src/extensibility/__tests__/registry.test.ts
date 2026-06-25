import { describe, it, expect, beforeEach } from "vitest";
import { TargetRegistry } from "../registry.js";
import type { TargetAdapter, GenerationOpts } from "../types.js";
import type { IR } from "../../ir/types.js";

function makeAdapter(name: string, displayName: string): TargetAdapter {
  return {
    name,
    displayName,
    generatorModulePath: `/generators/${name}/index.ts`,
    generatorNamespace: `yaml2code:${name}`,
    buildRunOptions(
      _ir: IR,
      baseOpts: GenerationOpts,
    ): Record<string, unknown> {
      return { ...baseOpts };
    },
  };
}

describe("TargetRegistry", () => {
  let registry: TargetRegistry;

  beforeEach(() => {
    registry = new TargetRegistry();
  });

  it("starts empty", () => {
    expect(registry.count).toBe(0);
    expect(registry.list()).toEqual([]);
    expect(registry.listNames()).toEqual([]);
  });

  it("registers a target", () => {
    const adapter = makeAdapter("vue", "Vue 3");
    registry.register(adapter);
    expect(registry.count).toBe(1);
    expect(registry.has("vue")).toBe(true);
  });

  it("throws on duplicate registration", () => {
    registry.register(makeAdapter("vue", "Vue 3"));
    expect(() =>
      registry.register(makeAdapter("vue", "Vue duplicate")),
    ).toThrow('Target "vue" is already registered.');
  });

  it("retrieves registered target", () => {
    const adapter = makeAdapter("spring", "Spring Boot");
    registry.register(adapter);
    const found = registry.get("spring");
    expect(found).toBe(adapter);
    expect(found!.displayName).toBe("Spring Boot");
  });

  it("returns undefined for unknown target", () => {
    expect(registry.get("nonexistent")).toBeUndefined();
  });

  it("lists all registered targets", () => {
    registry.register(makeAdapter("vue", "Vue"));
    registry.register(makeAdapter("spring", "Spring"));
    const list = registry.list();
    expect(list).toHaveLength(2);
    expect(list.map((r) => r.name).sort()).toEqual(["spring", "vue"]);
    expect(list[0].registeredAt).toBeDefined();
  });

  it("listNames returns sorted names", () => {
    registry.register(makeAdapter("spring", "Spring"));
    registry.register(makeAdapter("vue", "Vue"));
    expect(registry.listNames().sort()).toEqual(["spring", "vue"]);
  });

  it("reset clears all targets", () => {
    registry.register(makeAdapter("vue", "Vue"));
    registry.reset();
    expect(registry.count).toBe(0);
    expect(registry.list()).toEqual([]);
  });

  it("registration metadata includes timestamp", () => {
    registry.register(makeAdapter("target", "Target"));
    const list = registry.list();
    expect(list[0].registeredAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    );
  });

  it("has returns false for unregistered target", () => {
    registry.register(makeAdapter("vue", "Vue"));
    expect(registry.has("spring")).toBe(false);
    expect(registry.has("vue")).toBe(true);
  });
});

describe("TargetAdapter contract", () => {
  it("adapter satisfies interface", () => {
    const adapter = makeAdapter("test", "Test Target");
    expect(adapter.name).toBe("test");
    expect(adapter.displayName).toBe("Test Target");
    expect(adapter.generatorModulePath).toContain("test");
    expect(adapter.generatorNamespace).toBe("yaml2code:test");

    const baseOpts: GenerationOpts = {
      ir: {} as IR,
      outputDir: "/out",
      dryRun: false,
      force: true,
      skipInstall: true,
      format: false,
    };
    const result = adapter.buildRunOptions({} as IR, baseOpts);
    expect(result).toBeDefined();
    expect(result.outputDir).toBe("/out");
  });

  it("buildRunOptions preserves base options", () => {
    const adapter = makeAdapter("vue", "Vue 3");
    const baseOpts: GenerationOpts = {
      ir: { application: { name: "Test" } } as IR,
      outputDir: "/tmp/out",
      dryRun: true,
      force: false,
      skipInstall: false,
      format: true,
    };
    const result = adapter.buildRunOptions({} as IR, baseOpts);
    expect(result.outputDir).toBe("/tmp/out");
    expect(result.dryRun).toBe(true);
  });
});
