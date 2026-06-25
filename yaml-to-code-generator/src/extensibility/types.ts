import type { IR, BuildTool } from "../ir/types.js";

export interface GenerationOpts {
  ir: IR;
  outputDir: string;
  dryRun: boolean;
  force: boolean;
  skipInstall: boolean;
  format: boolean;
  buildTool?: BuildTool;
}

export interface TargetAdapter {
  readonly name: string;
  readonly displayName: string;
  readonly generatorModulePath: string;
  readonly generatorNamespace: string;

  buildRunOptions(ir: IR, baseOpts: GenerationOpts): Record<string, unknown>;
}
