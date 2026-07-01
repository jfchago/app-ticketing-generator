import { execSync } from 'child_process';
import { getEnv } from './yeoman-env.js';
import { readFileSync, writeFileSync } from 'fs';
import yaml from 'js-yaml';
import { parseYamlFile } from '../parser/yaml-parser.js';
import { validateSpec, SchemaValidationError } from '../validator/schema-validator.js';
import { buildIR, extendIRWithBehavior } from '../ir/builder.js';
import type { IR, BuildTool } from '../ir/types.js';
import { toIRSnapshot } from '../ir/snapshot.js';
import { EmbeddedSourceProvider } from '../providers/behavior-source-provider.js';
import { parseBehaviorBlock } from '../lang/ast-builder.js';
import type { BehaviorAST } from '../lang/ast-types.js';
import {
  buildSemanticModel,
  buildSemanticModelOrThrow,
  formatDiagnostics,
  SemanticDiagnosticsError,
  toSnapshot,
} from '../semantic/index.js';
import { parsePumlClassDiagram } from '../puml/puml-parser.js';
import { generatePumlClassDiagram } from '../puml/puml-generator.js';
import { ValidationError, BehaviorParseError, TargetError } from '../errors.js';
import { canonicalize, extractVersion, versionToString } from '../versioning/index.js';
import type { DslVersion } from '../versioning/types.js';
import { DEFAULT_REGISTRY } from '../extensibility/registry.js';
import type { TargetAdapter } from '../extensibility/types.js';
import '../extensibility/targets/vue.js';
import '../extensibility/targets/spring.js';
import '../extensibility/targets/diagrams.js';

import { buildVueGenerationModel } from '../generation/vue/builder.js';
import { buildSpringGenerationModel } from '../generation/spring/builder.js';

export { BuildTool };

export interface GenerateOptions {
  yamlPath: string;
  target: string;
  outputDir: string;
  dryRun?: boolean;
  skipValidation?: boolean;
  buildTool?: BuildTool;
  strictBehavior?: boolean;
  format?: boolean;
}

export interface GenerateResult {
  ir: IR;
  target: string;
  outputDir: string;
  originalVersion: DslVersion;
  canonicalVersion: DslVersion;
  migrated: boolean;
  migrationPath: string[];
  warnings: string[];
}

function resolveAdapter(target: string): TargetAdapter {
  const adapter = DEFAULT_REGISTRY.get(target);
  if (!adapter) {
    throw new TargetError(
      `Unknown target: "${target}". Known: ${DEFAULT_REGISTRY.listNames().join(', ')}`,
    );
  }
  return adapter;
}

export type InspectStage = 'raw' | 'validated' | 'semantic' | 'ir' | 'vue-model' | 'spring-model';

export function inspectStage(yamlPath: string, stage: InspectStage): unknown {
  const raw = parseYamlFile(yamlPath);
  if (stage === 'raw') return raw;

  const versioned = canonicalize(raw as Record<string, unknown>);
  const spec = validateSpec(versioned.spec);
  if (stage === 'validated') return spec;

  const semanticModel = buildSemanticModelOrThrow(spec, undefined, yamlPath);
  if (stage === 'semantic') return toSnapshot(semanticModel);

  const ir = buildIR(semanticModel);
  if (stage === 'ir') return toIRSnapshot(ir, yamlPath, 'cli-inspect', false);

  if (stage === 'vue-model') {
    const vueGen = buildVueGenerationModel(ir);
    return {
      features: vueGen.features,
      entityNames: Object.keys(vueGen.entities),
      enums: vueGen.enums.map((e: any) => ({
        name: e.name,
        valueCount: e.values.length,
      })),
      entities: Object.fromEntries(
        Object.entries(vueGen.entities).map(([name, gen]: [string, any]) => [
          name,
          {
            statePropertyName: gen.statePropertyName,
            selectedPropertyName: gen.selectedPropertyName,
            displayFieldCount: gen.displayFields.length,
            formFieldCount: gen.formFields.length,
            componentFlags: gen.components,
            useCaseNames: Object.keys(gen.useCases),
            storeActionCount: gen.storeActions.length,
            ruleCheckCount: gen.ruleChecks.length,
            hasCommentSupport: gen.hasCommentSupport,
            hasAssignee: gen.hasAssignee,
            transitionKeys: Object.keys(gen.transitions ?? {}),
          },
        ]),
      ),
    };
  }

  if (stage === 'spring-model') {
    const springGen = buildSpringGenerationModel(ir);
    return {
      features: springGen.features,
      entityNames: Object.keys(springGen.entities),
      enums: springGen.enums.map((e: any) => ({
        name: e.name,
        valueCount: e.values.length,
      })),
      entities: Object.fromEntries(
        Object.entries(springGen.entities).map(([name, gen]: [string, any]) => [
          name,
          {
            pkJavaType: gen.pkJavaType,
            attributeTypeNames: Object.keys(gen.attributeTypes),
            serviceMethodCount: gen.serviceMethods.length,
            serviceMethodNames: gen.serviceMethods.map((m: any) => m.name),
            endpointCount: gen.endpoints.length,
            repositoryMethodCount: gen.repositoryMethods.length,
            ruleCheckCount: gen.ruleChecks.length,
            hasCreatedAt: gen.hasCreatedAt,
            hasUpdatedAt: gen.hasUpdatedAt,
            oneToManyRelationCount: gen.oneToManyRelations.length,
            manyToOneRelationCount: gen.manyToOneRelations.length,
            emitsEvents: gen.emitsEvents,
            eventPublisherCount: gen.eventPublishers.length,
            transitionKeys: Object.keys(gen.transitions ?? {}),
          },
        ]),
      ),
    };
  }

  throw new Error(`Unknown inspect stage: ${stage}`);
}

export async function generate(options: GenerateOptions): Promise<GenerateResult> {
  console.log('📖 Step 1/6: Parsing YAML...');
  const raw = parseYamlFile(options.yamlPath);
  console.log(
    `   Parsed "${raw.application?.name ?? 'unknown'}" — ${raw.entities?.length ?? 0} entities`,
  );

  const originalVersion = extractVersion(raw as Record<string, unknown>);
  console.log(`   DSL version: ${versionToString(originalVersion)}`);

  console.log('⚙️  Canonicalizing...');
  const versioned = canonicalize(raw as Record<string, unknown>);
  if (versioned.migrated && versioned.migrationPath.length > 0) {
    console.log(`   Migrated: ${versioned.migrationPath.join(' → ')}`);
  }
  if (versioned.warnings.length > 0) {
    for (const w of versioned.warnings) {
      console.log(`   ${w.severity === 'error' ? '⛔' : '⚠'} [${w.code}] ${w.message}`);
    }
  }
  console.log(`   Canonical version: ${versionToString(versioned.canonicalVersion)}`);

  let spec;
  if (!options.skipValidation) {
    console.log('🔍 Step 2/6: Validating structure...');
    try {
      spec = validateSpec(versioned.spec);
      console.log('   Structure validated ✓');
    } catch (err) {
      if (err instanceof SchemaValidationError) {
        throw new ValidationError(err.message);
      }
      throw err;
    }
  } else {
    console.log('   ⚠ Skipping validation (--skip-validation)');
    spec = validateSpec(versioned.spec);
  }

  console.log('🔗 Step 3/6: Building Semantic Model...');
  const semanticModel = buildSemanticModelOrThrow(spec, undefined, options.yamlPath);
  console.log(formatDiagnostics(semanticModel.diagnostics));
  console.log(
    `   Semantic Model: ${semanticModel.domain.entities.length} entities, ${semanticModel.domain.enums.length} enums`,
  );

  console.log('🔧 Step 4/6: Building Intermediate Representation...');
  const ir = buildIR(semanticModel);
  console.log(`   IR built: ${ir.entities.length} entities, ${ir.enums.length} enums`);
  if (ir.buildFeatures) {
    const bf = ir.buildFeatures;
    const features: string[] = [];
    if (bf.hasStateMachine) features.push('StateMachine');
    if (bf.hasEvents) features.push('Events');
    if (bf.hasWorkflows) features.push('Workflows');
    if (bf.hasDecisions) features.push('Decisions');
    if (bf.hasRules) features.push('Rules');
    if (features.length > 0) console.log(`   Features: ${features.join(', ')}`);
  }

  // ── Behavioral pipeline ──
  const provider = new EmbeddedSourceProvider();
  const behaviorBlocks = provider.extract(versioned.spec as Record<string, unknown>);

  if (behaviorBlocks.length > 0) {
    console.log('🧩 Step 4b/6: Parsing behavior blocks...');
    const asts: BehaviorAST[] = [];
    for (const block of behaviorBlocks) {
      try {
        const ast = parseBehaviorBlock(block.type, block.raw);
        asts.push(ast);
      } catch (parseErr) {
        const msg = `Parse error in ${block.type} "${block.name ?? 'unnamed'}": ${(parseErr as Error).message}`;
        if (options.strictBehavior) {
          throw new BehaviorParseError(msg, {
            blockType: block.type,
            blockName: block.name,
          });
        }
        console.error(`   ⚠ ${msg}`);
      }
    }

    if (asts.length > 0) {
      console.log('   Validating behavior against Semantic Model...');
      buildSemanticModelOrThrow(spec, asts, options.yamlPath);
      console.log('   Behavior validation passed ✓');

      console.log('   Merging behavioral IR...');
      const entityMap = new Map<string, string>();
      for (const block of behaviorBlocks) {
        if (block.entityName && block.name) {
          entityMap.set(block.name, block.entityName);
        }
      }
      extendIRWithBehavior(ir, asts, { entityMap });
      console.log(
        `   Behavioral IR merged: ${ir.workflows?.length ?? 0} workflows, ${ir.events?.length ?? 0} events, ${ir.decisions?.length ?? 0} decisions`,
      );
    }
  } else {
    console.log('   No behavior blocks found — v1-compatible output');
  }

  // ── Yeoman dispatch ──
  const adapter = resolveAdapter(options.target);
  console.log(
    `📝 Step 5/6: Rendering templates (target: ${options.target}, adapter: ${adapter.displayName})...`,
  );

  const GeneratorClass = adapter.generatorClass;
  console.log('🚀 Step 6/6: Generating files...');

  const env = getEnv();
  env.registerStub(GeneratorClass, adapter.generatorNamespace, adapter.generatorModulePath);

  const runOpts = adapter.buildRunOptions(ir, {
    ir,
    outputDir: options.outputDir,
    dryRun: !!options.dryRun,
    force: true,
    skipInstall: true,
    format: !!options.format,
    buildTool: options.buildTool,
  });

  await env.run(adapter.generatorNamespace, runOpts);

  if (options.format && !options.dryRun) {
    try {
      const glob = `src/**/*.{ts,vue,json}`;
      execSync(`npx prettier --write "${glob}"`, {
        cwd: options.outputDir,
        stdio: 'pipe',
      });
      console.log('   Formatted with Prettier.');
    } catch (e) {
      console.log('   ⚠ Prettier — skipping format:', (e as Error).message);
    }
  }

  if (options.dryRun) {
    console.log(`   [dry-run] Would generate files in ${options.outputDir}`);
  } else {
    console.log(`   Files written to ${options.outputDir}`);
  }

  return {
    ir,
    target: options.target,
    outputDir: options.outputDir,
    originalVersion: versioned.originalVersion,
    canonicalVersion: versioned.canonicalVersion,
    migrated: versioned.migrated,
    migrationPath: versioned.migrationPath,
    warnings: versioned.warnings.map((w) => w.message),
  };
}

export function validateOnly(yamlPath: string, strictBehavior?: boolean): void {
  console.log('📖 Parsing YAML...');
  const raw = parseYamlFile(yamlPath);
  console.log(`   Parsed "${raw.application?.name ?? 'unknown'}"`);

  const originalVersion = extractVersion(raw as Record<string, unknown>);
  console.log(`   DSL version: ${versionToString(originalVersion)}`);

  console.log('⚙️  Canonicalizing...');
  const versioned = canonicalize(raw as Record<string, unknown>);
  if (versioned.migrated && versioned.migrationPath.length > 0) {
    console.log(`   Migrated: ${versioned.migrationPath.join(' → ')}`);
  }
  if (versioned.warnings.length > 0) {
    for (const w of versioned.warnings) {
      console.log(`   ${w.severity === 'error' ? '⛔' : '⚠'} [${w.code}] ${w.message}`);
    }
  }

  console.log('🔍 Validating structure...');
  const spec = validateSpec(versioned.spec);
  console.log('   ✓ Structure valid');

  console.log('🔗 Building Semantic Model...');
  const semanticModel = buildSemanticModel(spec, undefined, yamlPath);
  const diagnostics = semanticModel.diagnostics;
  console.log(formatDiagnostics(diagnostics));

  if (diagnostics.some((d) => d.severity === 'error')) {
    throw new SemanticDiagnosticsError(diagnostics);
  }

  if (strictBehavior) {
    const provider = new EmbeddedSourceProvider();
    const blocks = provider.extract(raw as Record<string, unknown>);
    if (blocks.length > 0) {
      console.log('   ✓ Behavior blocks validated (strict mode)');
    }
  }

  console.log('   ✓ Semantics valid');
  console.log('✅ All validations passed.');
}

export function pumlToYaml(inputPath: string, outputPath: string): void {
  console.log('📖 Reading PUML file...');
  const content = readFileSync(inputPath, 'utf8');

  console.log('🔍 Parsing class diagram...');
  const rawSpec = parsePumlClassDiagram(content);
  console.log(
    `   Found ${rawSpec.entities.length} entities, ${Object.keys(rawSpec.enums ?? {}).length} enums`,
  );

  console.log('⚙️  Canonicalizing...');
  const versioned = canonicalize(rawSpec as Record<string, unknown>);

  console.log('🔍 Validating extracted spec...');
  const validated = validateSpec(versioned.spec);
  const semanticModel = buildSemanticModelOrThrow(validated);
  console.log(formatDiagnostics(semanticModel.diagnostics));
  console.log('   ✓ Valid');

  const yamlOutput = yaml.dump(versioned.spec, { indent: 2, lineWidth: 120 });
  writeFileSync(outputPath, yamlOutput, 'utf8');

  console.log(`✅ YAML written to ${outputPath}`);
}

export function yamlToPuml(yamlPath: string, outputPath: string): void {
  console.log('📖 Reading YAML...');
  const raw = parseYamlFile(yamlPath);

  console.log('⚙️  Canonicalizing...');
  const versioned = canonicalize(raw as Record<string, unknown>);

  console.log('🔍 Validating...');
  const spec = validateSpec(versioned.spec);
  const semanticModel = buildSemanticModelOrThrow(spec);

  console.log('🔧 Building IR...');
  const ir = buildIR(semanticModel);

  console.log('📝 Generating PUML...');
  const puml = generatePumlClassDiagram(ir);

  writeFileSync(outputPath, puml, 'utf8');
  console.log(`✅ PUML written to ${outputPath}`);
}

export async function yamlToDiagrams(yamlPath: string, outputDir: string): Promise<void> {
  console.log('📖 Reading YAML...');
  const raw = parseYamlFile(yamlPath);

  console.log('⚙️  Canonicalizing...');
  const versioned = canonicalize(raw as Record<string, unknown>);

  console.log('🔍 Validating...');
  const spec = validateSpec(versioned.spec);

  console.log('🧠 Building Semantic Model...');
  const semanticModel = buildSemanticModelOrThrow(spec);
  console.log(formatDiagnostics(semanticModel.diagnostics));

  console.log('🔧 Building IR...');
  const ir = buildIR(semanticModel);

  console.log('📝 Generating diagrams...');
  const adapter = resolveAdapter('diagrams');
  const env = getEnv();
  env.registerStub(
    adapter.generatorClass,
    adapter.generatorNamespace,
    adapter.generatorModulePath,
  );
  await env.run(adapter.generatorNamespace, {
    ir,
    outputDir,
    dryRun: false,
    force: true,
    skipInstall: true,
  });
  console.log(`✅ Diagrams written to ${outputDir}`);
}
