# yaml-to-code-generator

A CLI tool that reads a YAML domain specification and generates full-stack code (Vue 3 + TypeScript frontend, Spring Boot 3 + Java backend, PlantUML diagrams) from a single source of truth.

## Why this tool exists

Before this tool, the team wrote domain entity types, CRUD REST endpoints, frontend types, Pinia stores, Vue components, and PlantUML documentation by hand in three separate codebases. Changes to a field name or relationship required synchronized edits across ~30+ files in Vue, Spring, and diagrams. Inevitably they drifted.

This tool replaces that manual synchronization with code generation. A YAML file declares entities, attributes, relationships, enums, use cases, and optional behavior blocks (state machines, workflows, events, decisions, rules). The generator produces all three output targets from that one file. When the domain changes, you edit the YAML and regenerate.

There is no off-the-shelf tool that produces both a Vue 3 SPA and a Spring Boot REST API from a single DSL while also emitting PlantUML diagrams with behavioral extensions. The DSL is specific to this team's architecture conventions (DDD-lite Pinia stores, Spring Data JPA repositories, MapStruct DTO mappers, etc.) and would not map cleanly to a generic solution like OpenAPI codegen.

## Repository structure

The only directory tracked in git is `yaml-to-code-generator/`. All other directories (e.g., `generated-repos/`, `diagrams/`, `docs/`) are generated output and gitignored — they can be named and placed arbitrarily.

```
.
├── AGENTS.md                         # Full project guide for AI coding agents
├── README.md                         # This file
├── .gitignore                        # Ignores all generated output
└── yaml-to-code-generator/           # The generator (sole tracked source)
    ├── generate.sh                   # Bash wrapper entry point
    ├── package.json                  # Dependencies and npm scripts
    ├── tsconfig.json                 # TypeScript config (strict, ES2022, bundler)
    ├── vitest.config.ts              # Vitest config
    ├── specs/                        # Input YAML domain specs (tracked)
    │   ├── helpdesk.yaml             # Primary spec (Mini HelpDesk)
    │   └── inventory.yaml            # Secondary spec (Inventory Manager)
    └── src/
        ├── cli.ts                    # Commander CLI entry point (7 commands)
        ├── errors.ts                 # Typed error classes
        ├── parser/                   # js-yaml wrapper
        ├── validator/                # Zod schemas for structural validation
        ├── versioning/               # DSL version detection and migration
        ├── semantic/                 # Cross-reference resolution and semantic rules
        ├── ir/                       # Intermediate Representation (types, builder, use-case-resolver)
        ├── lang/                     # Chevrotain behavior DSL parser (tokens, lexer, parser, AST)
        ├── providers/                # Behavior source provider interface
        ├── generation/               # Target-specific generation models (vue, spring)
        ├── extensibility/            # Plugin architecture for targets (registry, adapters)
        ├── puml/                     # PlantUML parsing and generation (puml-to-yaml and yaml-to-puml)
        ├── generator/                # Main pipeline orchestrator + Yeoman env
        └── generators/               # EJS template packs (base, vue, spring, diagrams)
```

## Prerequisites

- **Node.js** — 18 or later (tested on 22). The `generate.sh` wrapper enforces this.
- **Java 17+** — required only if you intend to compile or run the generated Spring backend. The generator itself does not need Java.

No database or other services are required to run the generator.

## Installation

```bash
git clone <this-repo-url>
cd yaml-to-code-generator
npm ci
```

The `generate.sh` wrapper script also runs `npm ci` automatically on first use if `node_modules/` is missing. There is no `.env` file or external configuration.

## Usage

All commands are run from the `yaml-to-code-generator/` directory.

### Validate a spec

```bash
./generate.sh validate --spec specs/helpdesk.yaml           # basic validation
./generate.sh validate --spec specs/helpdesk.yaml --strict-behavior  # fail on behavior parse errors
```

### Generate code

| Target | Command |
|--------|---------|
| Vue 3 frontend | `./generate.sh generate --spec specs/helpdesk.yaml --target vue --output ../output-dir` |
| Spring Boot (Gradle) | `./generate.sh generate --spec specs/helpdesk.yaml --target spring --output ../output-dir` |
| Spring Boot (Maven) | `./generate.sh generate --spec specs/helpdesk.yaml --target spring --build-tool maven --output ../output-dir` |
| PlantUML diagrams | `./generate.sh generate --spec specs/helpdesk.yaml --target diagrams --output ../output-dir` |
| Dry run (preview) | `./generate.sh generate --spec specs/helpdesk.yaml --target vue --output ../output-dir --dry-run` |

### Utilities

| Command | Purpose |
|---------|---------|
| `./generate.sh puml-to-yaml --input diagram.puml --output output.yaml` | Convert a PlantUML class diagram back to YAML |
| `./generate.sh yaml-to-diagrams --spec specs/helpdesk.yaml --output ../output-dir` | Generate all diagrams in one shot |
| `./generate.sh inspect --spec specs/helpdesk.yaml --stage ir` | Dump an intermediate pipeline stage as JSON |

### Direct CLI (without the wrapper)

```bash
npx tsx src/cli.ts generate -s specs/helpdesk.yaml -t vue -o ../output
npx tsx src/cli.ts validate -s specs/helpdesk.yaml
npx tsx src/cli.ts inspect -s specs/helpdesk.yaml --stage ir
```

### End-to-end workflow

```bash
# 1. Edit the YAML spec
# 2. Validate it
./generate.sh validate --spec specs/helpdesk.yaml --strict-behavior

# 3. Generate all three targets
./generate.sh generate --spec specs/helpdesk.yaml --target vue      --output ../vue-app
./generate.sh generate --spec specs/helpdesk.yaml --target spring   --output ../spring-api
./generate.sh generate --spec specs/helpdesk.yaml --target diagrams --output ../diagrams

# 4. Build and test the outputs
cd ../spring-api && ./gradlew bootRun &
cd ../vue-app    && npm run dev

# 5. (optional) Run the generator's own tests
cd ../yaml-to-code-generator && npm test
```

### `generate` command options

| Flag | Required | Description |
|------|----------|-------------|
| `-s, --spec <path>` | Yes | Path to the YAML spec file |
| `-t, --target <name>` | Yes | `vue`, `spring`, or `diagrams` |
| `-o, --output <dir>` | Yes | Output directory for generated files |
| `-d, --dry-run` | No | Preview files without writing to disk |
| `--skip-validation` | No | Skip Zod structural validation (not recommended) |
| `--strict-behavior` | No | Fail on behavior block parse errors instead of warning |
| `--build-tool <tool>` | No | `gradle` (default) or `maven` — Spring target only |
| `--format` | No | Run Prettier on generated files after writing |

## Architecture

The generator runs a pipeline of 6 stages:

```
YAML file (helpdesk.yaml)
  │
  ▼
┌──────────────────────┐
│ 1. YAML Parser       │  js-yaml → RawSpec (plain JS object)
│    src/parser/       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 2. Canonicalizer     │  Version detection, migration, normalization
│    src/versioning/   │  (so old YAML schemas still parse)
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 3. Zod Validator     │  Structural validation: required fields, types,
│    src/validator/    │  cross-references. Produces ValidatedSpec.
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 4. Semantic Model    │  Resolves relationships, infers PK types,
│    src/semantic/     │  validates use cases, emits diagnostics.
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 5. IR Builder        │  Maps semantic model to language-agnostic IR.
│    src/ir/           │  Optional behavior blocks (workflows, events,
│                      │  decisions, rules) are parsed via Chevrotain
│                      │  and merged into the IR.
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 6. Yeoman Generator  │  EJS templates render files from the IR.
│    src/generators/   │  One generator per target (vue, spring, diagrams).
└──────────┬───────────┘
           │
           ▼
  Generated files on disk
```

Key architectural decisions:

- **EJS `with()` rendering instead of strict mode** — EJS 3.x strict mode does not make `ir` and `entity` variables accessible inside templates. The renderer uses `with()`-based rendering so templates can use bare variable names.
- **Target-specific generation models** — Before rendering, the pipeline builds a generation model (in `src/generation/`) that pre-computes fields, store actions, and service signatures. Templates receive this model instead of raw IR, keeping template logic minimal.
- **Behavior blocks are optional** — If a YAML file has no behavior blocks, the Chevrotain parsing stage is skipped and output is identical to v1. The IR builder falls back to inferring state machines from transition tables.
- **Use case resolver as central registry** — `src/ir/use-case-resolver.ts` maps use case names to HTTP methods and method names. All templates and generation models read from this single registry. Add one entry to support a new use case across all targets.

## Known limitations

- **Generated code must not be hand-edited.** The YAML DSL is the single source of truth. Change the YAML or the EJS template — never the output.
- **Not all generated files are wired into the application.** Some behavioral constructs (workflow orchestrators, event handlers) are generated as standalone files but are not imported automatically. Integration into the app's runtime is manual.
- **Missing templates are silently skipped.** If the IR contains a feature but the target's template directory has no matching template, nothing is generated and no error is raised. This is by design for incremental template development.
- **Application class name stripping.** `ir.application.appClassName` strips non-alphanumeric characters from the YAML `application.name` field. Use this value (not `pascalCase`) for Java class names.
- **Cannot run the generator while a dev server is running in the same output directory.** The generator overwrites files, which can cause file-lock errors or HMR loops.
