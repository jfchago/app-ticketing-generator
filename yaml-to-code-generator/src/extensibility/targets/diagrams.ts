import { DiagramGenerator } from "../../generators/diagrams/index.js";
import { DEFAULT_REGISTRY } from "../registry.js";
import type { TargetAdapter, GenerationOpts } from "../types.js";
import type { IR } from "../../ir/types.js";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const _dir = dirname(fileURLToPath(import.meta.url));

const DIAGRAMS_PATH = resolve(_dir, "../../generators/diagrams/index.ts");

const DIAGRAMS_ADAPTER: TargetAdapter = {
  name: "puml",
  displayName: "PlantUML Diagrams",
  generatorModulePath: DIAGRAMS_PATH,
  generatorNamespace: "yaml2code:diagrams",

  buildRunOptions(_ir: IR, baseOpts: GenerationOpts): Record<string, unknown> {
    return {
      ...baseOpts,
    };
  },
};

const DIAGRAMS_ALIAS_ADAPTER: TargetAdapter = {
  name: "diagrams",
  displayName: "PlantUML Diagrams (alias)",
  generatorModulePath: DIAGRAMS_PATH,
  generatorNamespace: "yaml2code:diagrams",

  buildRunOptions(_ir: IR, baseOpts: GenerationOpts): Record<string, unknown> {
    return {
      ...baseOpts,
    };
  },
};

export { DiagramGenerator, DIAGRAMS_ADAPTER, DIAGRAMS_ALIAS_ADAPTER };

DEFAULT_REGISTRY.register(DIAGRAMS_ADAPTER);
DEFAULT_REGISTRY.register(DIAGRAMS_ALIAS_ADAPTER);
