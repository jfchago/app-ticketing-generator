// generators/base/index.ts — Yeoman BaseGenerator for code generation
// All target generators (Vue, Spring, Diagrams) extend this class.
// Provides helper methods for template rendering and file output.

import Generator from 'yeoman-generator';
import type { IR } from '../../ir/types.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const _modulePath = dirname(fileURLToPath(import.meta.url));

export interface BaseGeneratorOptions {
  ir: IR;
  outputDir: string;
  dryRun: boolean;
  /** Additional context injected into every template */
  extraContext?: Record<string, unknown>;
  /** Run Prettier on generated files after writing */
  format?: boolean;
}

/**
 * Base generator class wrapping Yeoman's Generator.
 *
 * Usage in target generators:
 *   class MyGenerator extends BaseGenerator {
 *     writing() {
 *       this.renderTemplate('template.ejs', 'output/path.ext', { entity });
 *     }
 *   }
 */
export class BaseGenerator extends Generator {
  protected ir: IR;
  protected outputDir: string;
  protected dryRun: boolean;
  protected globalContext: Record<string, unknown>;

  constructor(args: string[], opts: BaseGeneratorOptions & Record<string, unknown>) {
    super(args, { ...opts } as any);
    this.ir = opts.ir as IR;
    this.outputDir = opts.outputDir as string;
    this.dryRun = opts.dryRun as boolean;
    this.globalContext = (opts.extraContext ?? {}) as Record<string, unknown>;
    this.destinationRoot(this.outputDir);
    this.sourceRoot(this.determineSourceRoot());
  }

  // initializing lifecycle hook is NOT auto-inherited by subclasses in yeoman-generator v8
  // (requires inheritTasks feature). destinationRoot is set in constructor instead.

  /**
   * Override in subclasses to define template source root.
   * Default: resolves to `generators/{target}/templates/`
   */
  protected determineSourceRoot(): string {
    const callerPath =
      new Error().stack?.split('\n')[2]?.match(/\((.*?):\d+:\d+\)/)?.[1] ?? _modulePath;
    return callerPath.replace(/[/\\][^/\\]+\.\w+$/, '/templates');
  }

  /**
   * Renders an EJS template via Yeoman's mem-fs-editor (stages in memory,
   * committed by end()). Context is merged with ir, globalContext,
   * and extra per-template vars.
   */
  protected renderEjs(
    templateRelPath: string,
    outputRelPath: string,
    extraVars: Record<string, unknown> = {},
  ): void {
    const ctx = {
      ir: this.ir,
      ...this.globalContext,
      ...extraVars,
    };
    this.fs.copyTpl(this.templatePath(templateRelPath), this.destinationPath(outputRelPath), ctx);
  }

  /**
   * Copies a static file verbatim (no EJS rendering).
   */
  protected copyStatic(templateRelPath: string, outputRelPath: string): void {
    this.fs.copy(this.templatePath(templateRelPath), this.destinationPath(outputRelPath));
  }

  /**
   * Yeoman lifecycle hook that runs after writing().
   * - dry-run: dumps the virtual filesystem for preview.
   * - normal: commits staged files to disk.
   */
  end() {
    if (this.dryRun) {
      this.log('\n[dry-run] Files staged in memory:');
      const files = this.fs.dump(this.outputDir);
      for (const [filePath, info] of Object.entries(files)) {
        this.log(`  ${filePath} (${(info.contents ?? '').length} chars)`);
      }
    } else {
      this.fs.commit();
      this.log('   Files committed to disk.');
    }
  }
}
