import { describe, it, expect } from "vitest";
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
      return { ...baseOpts, [`${name}Gen`]: {}, genEntities: {} };
    },
  };
}

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

  it("adapters inject target-specific context", () => {
    const adapter = makeAdapter("vue", "Vue 3");
    const opts = adapter.buildRunOptions({} as IR, {
      ir: {} as IR,
      outputDir: "/out",
      dryRun: false,
      force: true,
      skipInstall: true,
      format: false,
    });
    expect(opts.vueGen).toBeDefined();
    expect(opts.genEntities).toBeDefined();
  });
});

describe("Registry with built-in targets", () => {
  it("registers multiple targets", () => {
    const registry = new TargetRegistry();
    registry.register(makeAdapter("vue", "Vue 3"));
    registry.register(makeAdapter("spring", "Spring Boot"));
    registry.register(makeAdapter("puml", "PlantUML"));
    registry.register(makeAdapter("diagrams", "Diagrams"));

    expect(registry.count).toBe(4);
    expect(registry.has("vue")).toBe(true);
    expect(registry.has("spring")).toBe(true);
    expect(registry.has("puml")).toBe(true);
    expect(registry.has("diagrams")).toBe(true);
  });

  it("targets have distinct module paths", () => {
    const registry = new TargetRegistry();
    registry.register(makeAdapter("vue", "Vue"));
    registry.register(makeAdapter("spring", "Spring"));

    const vue = registry.get("vue")!;
    const spring = registry.get("spring")!;
    expect(vue.generatorModulePath).not.toBe(spring.generatorModulePath);
  });

  it("each target has valid namespace", () => {
    const registry = new TargetRegistry();
    registry.register(makeAdapter("vue", "Vue"));
    registry.register(makeAdapter("spring", "Spring"));

    for (const name of ["vue", "spring"]) {
      const adapter = registry.get(name);
      expect(adapter).toBeDefined();
      expect(adapter!.generatorNamespace).toMatch(/^yaml2code:/);
      expect(adapter!.generatorModulePath).toContain("generators");
    }
  });
});
