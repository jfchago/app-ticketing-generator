#!/usr/bin/env node
import './polyfills.js';
import { Command } from 'commander';
import {
  generate,
  validateOnly,
  pumlToYaml,
  yamlToPuml,
  yamlToDiagrams,
  inspectStage,
} from './generator/orchestrator.js';
import type { InspectStage } from './generator/orchestrator.js';

const program = new Command();

program
  .name('yaml2code')
  .description('Generate source code from a YAML domain specification')
  .version('2.0.0');

program
  .command('generate')
  .description('Parse YAML, validate, and generate code')
  .requiredOption('-s, --spec <path>', 'Path to the YAML specification file')
  .requiredOption('-t, --target <name>', 'Target template pack (vue, spring, diagrams)')
  .requiredOption('-o, --output <path>', 'Output directory for generated files')
  .option('-d, --dry-run', 'Preview without writing files')
  .option('--skip-validation', 'Skip semantic validation (not recommended)')
  .option('--build-tool <tool>', 'Build tool for Spring target: gradle (default) or maven')
  .option('--strict-behavior', 'Enable strict behavior block validation (parse + cross-reference)')
  .option('--format', 'Run Prettier on generated files after writing')
  .action(async (options) => {
    try {
      await generate({
        yamlPath: options.spec,
        target: options.target,
        outputDir: options.output,
        dryRun: options.dryRun,
        skipValidation: options.skipValidation,
        buildTool: options.buildTool,
        strictBehavior: options.strictBehavior,
        format: options.format,
      });
      console.log('\n✅ Generation complete.');
    } catch (err) {
      console.error(`\n❌ Generation failed: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate a YAML spec without generating code')
  .requiredOption('-s, --spec <path>', 'Path to the YAML specification file')
  .option('--strict-behavior', 'Enable strict behavior block validation (parse + cross-reference)')
  .action((options) => {
    try {
      validateOnly(options.spec, options.strictBehavior);
    } catch (err) {
      console.error(`\n❌ Validation failed: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('puml-to-yaml')
  .description('Convert a PlantUML class diagram to YAML')
  .requiredOption('-i, --input <path>', 'Path to .puml file')
  .requiredOption('-o, --output <path>', 'Output path for generated YAML file')
  .action((options) => {
    try {
      pumlToYaml(options.input, options.output);
    } catch (err) {
      console.error(`\n❌ Conversion failed: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('yaml-to-puml')
  .description('Generate a PlantUML class diagram from YAML (legacy, single file)')
  .requiredOption('-s, --spec <path>', 'Path to the YAML specification file')
  .requiredOption('-o, --output <path>', 'Output path for generated .puml file')
  .action((options) => {
    try {
      yamlToPuml(options.spec, options.output);
    } catch (err) {
      console.error(`\n❌ Conversion failed: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('yaml-to-diagrams')
  .description(
    'Generate all PlantUML diagrams from YAML (class, state, activity, sequence, use case)',
  )
  .requiredOption('-s, --spec <path>', 'Path to the YAML specification file')
  .requiredOption('-o, --output <dir>', 'Output directory for generated .puml files')
  .action(async (options) => {
    try {
      await yamlToDiagrams(options.spec, options.output);
      console.log('\n✅ Diagrams generated.');
    } catch (err) {
      console.error(`\n❌ Diagram generation failed: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('inspect')
  .description('Inspect a pipeline stage and dump its JSON representation to stdout')
  .requiredOption('-s, --spec <path>', 'Path to the YAML specification file')
  .requiredOption(
    '--stage <name>',
    'Pipeline stage to inspect (raw, validated, semantic, ir, vue-model, spring-model)',
  )
  .action((options) => {
    try {
      const result = inspectStage(options.spec, options.stage as InspectStage);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error(`\n❌ Inspection failed: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program.parse();
