# yaml-to-code-generator

A CLI tool that reads a YAML domain specification and generates full-stack
code (Vue 3 + TypeScript frontend, Spring Boot 3 + Java backend, PlantUML
diagrams) from a single source of truth.

## Why this tool exists

Before this tool, the team wrote domain entity types, CRUD REST endpoints,
frontend types, Pinia stores, Vue components, and PlantUML documentation by
hand in three separate codebases. Changes to a field name or relationship
required synchronized edits across ~30+ files in Vue, Spring, and diagrams.
Inevitably they drifted.

This tool replaces that manual synchronization with code generation. A YAML
file declares entities, attributes, relationships, enums, use cases, and
optional behavior blocks (state machines, workflows, events, decisions,
rules). The generator produces all three output targets from that one file.
When the domain changes, you edit the YAML and regenerate.

There is no off-the-shelf tool that produces both a Vue 3 SPA and a Spring
Boot REST API from a single DSL while also emitting PlantUML diagrams with
behavioral extensions. The DSL is specific to this team's architecture
conventions (DDD-lite Pinia stores, Spring Data JPA repositories, MapStruct
DTO mappers, etc.) and would not map cleanly to a generic solution like
OpenAPI codegen.

## Prerequisites

- **Node.js** — 18 or later (tested on 22). The `generate.sh` wrapper
  enforces this.
- **npm** — ships with Node.js.
- **Java 17+** — required only if you intend to compile or run the generated
  Spring backend. The generator itself does not need Java.
- **Bash** — the `generate.sh` wrapper script requires bash (Git Bash on
  Windows works, WSL too). You can also call the CLI directly with `npx tsx`
  if you prefer.

No database or other services are required to run the generator.

## Installation

```bash
git clone <this-repo-url> agents-meta-context
cd agents-meta-context/yaml-to-code-generator
npm ci
```

The `npm ci` command installs all dependencies from `package-lock.json`. The
`generate.sh` wrapper script also runs `npm ci` automatically on first use
if `node_modules/` is missing.

There is no `.env` file or external configuration. The generator reads its
spec from the YAML file you pass on the command line and writes output to
the directory you specify.

## Usage

### The wrapper script (recommended)

All commands are run from the `yaml-to-code-generator/` directory.

```bash
# Validate a spec without generating code
./generate.sh validate --spec specs/helpdesk.yaml

# Validate with strict behavior block parsing
./generate.sh validate --spec specs/helpdesk.yaml --strict-behavior

# Generate a Vue 3 frontend
./generate.sh generate --spec specs/helpdesk.yaml --target vue --output ../generated-repos/vue-poc-agents

# Generate a Spring Boot backend (Gradle, the default)
./generate.sh generate --spec specs/helpdesk.yaml --target spring --output ../generated-repos/spring-backend

# Generate a Spring Boot backend with Maven
./generate.sh generate --spec specs/helpdesk.yaml --target spring --build-tool maven --output ../generated-repos/spring-backend

# Generate all PlantUML diagrams (class, state, sequence, activity, use case)
./generate.sh generate --spec specs/helpdesk.yaml --target diagrams --output ../specs/diagrams

# Dry run — preview output without writing files
./generate.sh generate --spec specs/helpdesk.yaml --target vue --output ../output --dry-run

# Convert a PlantUML class diagram back to YAML
./generate.sh puml-to-yaml --input ../specs/some-diagram.puml --output output.yaml

# Generate a single PlantUML class diagram file (legacy)
./generate.sh yaml-to-puml --spec specs/helpdesk.yaml --output output.puml

# Generate all diagrams in one shot
./generate.sh yaml-to-diagrams --spec specs/helpdesk.yaml --output ../specs/diagrams

# Inspect an intermediate pipeline stage (dumps JSON to stdout)
./generate.sh inspect --spec specs/helpdesk.yaml --stage ir
```

### Direct CLI (without the wrapper)

```bash
npx tsx src/cli.ts generate -s specs/helpdesk.yaml -t vue -o ../output
npx tsx src/cli.ts validate -s specs/helpdesk.yaml
npx tsx src/cli.ts inspect -s specs/helpdesk.yaml --stage semantic
```

### Available targets

| Target     | Flag          | Output                                                            |
| ---------- | ------------- | ----------------------------------------------------------------- |
| `vue`      | `-t vue`      | Vue 3 + TypeScript SPA with Pinia stores, Axios repos, Vue Router |
| `spring`   | `-t spring`   | Spring Boot 3 REST API with JPA entities, DTOs, MapStruct mappers |
| `diagrams` | `-t diagrams` | PlantUML class, state, sequence, activity, and use case diagrams  |

### `generate` command options

| Flag                  | Required | Description                                            |
| --------------------- | -------- | ------------------------------------------------------ |
| `-s, --spec <path>`   | Yes      | Path to the YAML spec file                             |
| `-t, --target <name>` | Yes      | `vue`, `spring`, or `diagrams`                         |
| `-o, --output <dir>`  | Yes      | Output directory for generated files                   |
| `-d, --dry-run`       | No       | Preview files without writing to disk                  |
| `--skip-validation`   | No       | Skip Zod structural validation (not recommended)       |
| `--strict-behavior`   | No       | Fail on behavior block parse errors instead of warning |
| `--build-tool <tool>` | No       | `gradle` (default) or `maven` — Spring target only     |
| `--format`            | No       | Run Prettier on generated files after writing          |

### Typical end-to-end workflow

```bash
# 1. Edit the YAML spec
vim specs/helpdesk.yaml

# 2. Validate it
./generate.sh validate --spec specs/helpdesk.yaml --strict-behavior

# 3. Generate all three targets
./generate.sh generate --spec specs/helpdesk.yaml --target vue      --output ../generated-repos/vue-poc-agents
./generate.sh generate --spec specs/helpdesk.yaml --target spring   --output ../generated-repos/spring-backend
./generate.sh generate --spec specs/helpdesk.yaml --target diagrams --output ../specs/diagrams

# 4. Build and test the outputs
cd ../generated-repos/spring-backend && ./gradlew bootRun &
cd ../generated-repos/vue-poc-agents    && npm run dev

# 5. (optional) Run the generator's own tests
cd ../yaml-to-code-generator && npm test
```

## Architecture and how it works

The generator runs a pipeline of 6 stages. Each stage transforms data and
feeds the next.

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
│ 5. IR Builder        │  Maps semantic model to language-agnostic IR
│    src/ir/           │  (EntityDef, EnumDef, UseCaseDef, etc.).
│                      │  If the YAML has behavior blocks (optional):
│                      │    a. Chevrotain parser tokenizes the DSL
│                      │       strings (src/lang/)
│                      │    b. AST builder produces typed AST nodes
│                      │    c. IR builder merges behavioral constructs
│                      │       (workflows, events, decisions, rules)
│                      │       into the IR
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 6. Yeoman Generator  │  EJS templates render files from the IR.
│    src/generators/   │  One generator per target (vue/, spring/,
│                      │  diagrams/). Each template receives { ir, entity? }.
└──────────┬───────────┘
           │
           ▼
  Generated files on disk
```

### Non-obvious design decisions

**EJS `with()` rendering instead of strict mode.**
EJS 3.x strict mode does not make data variables (`ir`, `entity`) accessible
inside templates. The renderer deliberately avoids `strict: true` and uses
`with()`-based rendering instead. This means templates can access `ir` and
`entity` as bare variable names without prefixing them.

**Separate generation models per target.**
The IR is language-agnostic. Before rendering, the pipeline builds a
target-specific generation model (in `src/generation/vue/builder.ts` and
`src/generation/spring/builder.ts`). This model pre-computes things like
"which fields are display fields", "what Pinia store actions are needed",
and "which Java service method signatures to generate". The EJS templates
receive this pre-computed model, not the raw IR. This keeps templates simple
and avoids complex logic in the template layer.

**Behavior blocks are optional.**
If a YAML file has no behavior blocks (workflows, events, decisions, rules),
the Chevrotain parsing stage is skipped entirely and the output is identical
to v1. The `synthesizeBehavior()` function in the IR builder falls back to
inferring state machines from transition tables and generating "dumb" CRUD
orchestrators. This means you can write a spec without any DSL strings and
still get working code.

**External behavior source provider.**
Behavior blocks can live inline in the YAML file (multiline strings under
`workflows:`, `events:`, or `decisions:`) or be loaded from external `.dsl`
files via the `BehaviorSourceProvider` interface. Currently only the
`EmbeddedSourceProvider` is implemented. The abstraction exists so that
future work can move behavior blocks to separate files without changing
the parser or IR builder.

**Use case resolver central registry.**
The file `src/ir/use-case-resolver.ts` maps use case names (like `get_all`,
`update_status`, `assign_user`) to HTTP methods, path suffixes, and method
names. All templates and both generation models read from this single
registry. To add a new use case (e.g., `bulk_archive`), you add one entry
to `USE_CASE_MAP` and the change propagates to Vue repositories, Vue stores,
Spring controllers, Spring services, and sequence diagrams automatically.

**Template file naming convention.**
Generated file paths use `entity.nameCamel` (lowercase) for directories.
PascalCase is reserved for type names and class names only. For example,
a `TicketCard.vue` component lives in `components/TicketCard.vue` but
references the type `Ticket` from `domain/ticket/ticket.types.ts`. Do not
confuse the casing of directory names with type names.

**EJS `<%-` vs `<%=` for string values.**
Templates use `<%-` (raw output) for values containing quotes (labels,
messages) because `<%=` HTML-escapes single quotes to `&#39;`, which
produces invalid code.

## Key files and folders

```
.
├── AGENTS.md                         # Full project guide for AI coding agents
├── README.md                         # This file
├── docs/                             # Design docs and reference (22+ files)
│   ├── 01-architecture-overview.md   # Data flow diagram and component map
│   ├── 02-yaml-dsl-reference.md      # YAML schema specification
│   ├── 03-ir-reference.md            # IR types and builder logic
│   ├── 04-pipeline.md                # Pipeline stage details
│   ├── 11-behavior-dsl-reference.md  # EBNF grammar for all DSL block types
│   └── ...
├── generated-repos/                  # Generated output (gitignored)
│   ├── vue-poc-agents/               # Last Vue 3 frontend generation
│   └── spring-backend/               # Last Spring Boot backend generation
├── specs/                             # Generated diagram output (gitignored)
│   └── diagrams/
└── yaml-to-code-generator/           # The generator (tracked in git)
    ├── generate.sh                   # Bash wrapper entry point
    ├── package.json                  # Dependencies and npm scripts
    ├── tsconfig.json                 # TypeScript config (strict, ES2022, bundler)
    ├── vitest.config.ts              # Vitest config
    ├── specs/                        # Input YAML domain specs
    │   ├── helpdesk.yaml             # Primary spec (Mini HelpDesk)
    │   └── inventory.yaml            # Secondary spec (Inventory Manager)
    ├── src/
    │   ├── cli.ts                    # Commander CLI entry point (7 commands)
    │   ├── errors.ts                 # Typed error classes (GenerationError, etc.)
    │   ├── parser/
    │   │   └── yaml-parser.ts        # js-yaml wrapper, reads YAML to RawSpec
    │   ├── validator/
    │   │   └── schema-validator.ts   # Zod schemas for structural validation
    │   ├── versioning/               # DSL version detection and migration
    │   │   ├── canonicalize.ts       # Normalizes old schemas to current version
    │   │   ├── migrator.ts           # Schema migration logic
    │   │   └── types.ts              # DslVersion type
    │   ├── semantic/                 # Semantic analysis layer (v2)
    │   │   ├── index.ts              # Public API (buildSemanticModel, diagnostics)
    │   │   ├── resolver.ts           # Cross-reference resolution
    │   │   ├── validator.ts          # Semantic rules (duplicate names, etc.)
    │   │   └── types.ts              # Semantic model types
    │   ├── ir/                       # Intermediate Representation
    │   │   ├── types.ts              # IR type definitions (EntityDef, IR, etc.)
    │   │   ├── builder.ts            # Structural IR builder + behavioral merge
    │   │   ├── use-case-resolver.ts  # Central use case → HTTP method mapping
    │   │   └── snapshot.ts           # IR serialization for inspect/debug
    │   ├── lang/                     # Chevrotain behavior DSL parser
    │   │   ├── tokens.ts             # Lexer token definitions
    │   │   ├── lexer.ts              # Chevrotain Lexer
    │   │   ├── parser.ts             # 7 mini-parsers (stateMachine, workflow, etc.)
    │   │   ├── ast-types.ts          # Behavior AST interfaces
    │   │   ├── ast-builder.ts        # CST → AST transformation
    │   │   └── ast-validator.ts      # AST semantic validation
    │   ├── providers/
    │   │   └── behavior-source-provider.ts  # Source provider interface + embedded impl
    │   ├── generation/               # Target-specific generation models
    │   │   ├── vue/builder.ts        # Vue generation model builder
    │   │   ├── spring/builder.ts     # Spring generation model builder
    │   │   └── common.ts             # Shared generation utilities
    │   ├── extensibility/            # Plugin architecture for targets
    │   │   ├── registry.ts           # Target adapter registry
    │   │   ├── types.ts              # TargetAdapter interface
    │   │   └── targets/              # Per-target adapter configs
    │   │       ├── vue.ts
    │   │       ├── spring.ts
    │   │       └── diagrams.ts
    │   ├── puml/                     # PlantUML parsing and generation
    │   │   ├── puml-parser.ts        # PUML class diagram → RawSpec
    │   │   └── puml-generator.ts     # RawSpec → PUML class diagram
    │   ├── generator/
    │   │   ├── orchestrator.ts       # Main pipeline: parse → validate → IR → Yeoman
    │   │   └── yeoman-env.ts         # Yeoman environment configuration
    │   └── generators/               # EJS template packs
    │       ├── base/index.ts         # BaseGenerator (all targets extend this)
    │       ├── vue/index.ts          # Vue target generator
    │       ├── spring/index.ts       # Spring target generator
    │       └── diagrams/index.ts     # Diagram target generator
    └── templates/ is inside each generators/<target>/ directory
```

## Known limitations and gotchas

**Generated code must not be hand-edited.**
The YAML DSL is the single source of truth. Any change made directly to a
generated file will be overwritten the next time you run the generator. If
you need to customize generated code, modify the EJS template or extend the
IR builder — never edit the output.

**Not all generated files are wired into the application.**
Several behavioral constructs (workflow orchestrators, event handlers,
decision classes in the Vue target) are generated into standalone files but
are not imported or wired into the application automatically. The generator
annotates these files so you know they exist, but integrating them into the
app's runtime is manual.

**Workflows generate the dispatch pattern, not the dispatch wiring.**
The Vue orchestrator generates `ctx.dispatch(action, payload)` calls and
typed action names. The caller is responsible for wiring those to actual
API calls. The Spring orchestrator generates service method stubs. Neither
is a fully wired runtime — they are correctly structured skeleton code.

**EJS strict mode is not used.**
See the architecture section above. If you write templates that use `ir.` as
a prefix where a variable is expected in strict mode, those templates will
fail silently in the current renderer.

**Template files that don't exist are silently skipped.**
If the IR contains a feature (e.g., an event) but the target's template
directory has no matching template, nothing is generated and no error is
raised. This is by design so that templates can be added incrementally.

**The `target` CLI value must match the template directory name exactly.**
Valid values are `vue`, `spring`, `diagrams`, and the legacy alias `puml`
(maps to `diagrams`). Any other value throws `TARGET_ERROR`.

**Behavior parse errors are warnings by default.**
If a behavior block (workflow, event, decision) fails to parse, the
generator prints a warning and continues. Use `--strict-behavior` to make
parse errors fatal.

**The Spring generator produces both Gradle and Maven build files.**
When you pass `--build-tool maven`, both `build.gradle` and `pom.xml` are
generated. The `--build-tool` flag only determines which build file the
template renders actively; the other is a static copy. <!-- NEEDS CLARIFICATION: whether this dual-output behavior is intentional or a bug -->

**Application class name stripping.**
`ir.application.appClassName` strips all non-alphanumeric characters from
the YAML `application.name` field. `"Mini HelpDesk"` becomes
`"MiniHelpDesk"`. Use this value, not `pascalCase(ir.application.name)`, for
Java class names, or you will get case mismatches if the app name contains
spaces or special characters.

**The Vue app has no lint, format, or test commands.**
The `vue-poc-agents/package.json` defines only `dev`, `build`, and
`preview`. Type checking happens as part of `npm run build` (which runs
`vue-tsc`). There is no `npm run lint` or `npm run test`.

**The generator itself has limited test coverage.**
Tests live in `src/**/*.test.ts` and can be run with `npm test` (vitest).
Coverage is spotty — the behavior parser has tests, but the generation
models, IR builder, and CLI have minimal or no test coverage.

**You cannot run the generator while the Vue dev server or Spring backend
are running if they are accessing the same output directory.**
The generator overwrites files in the output directory. If a running process
has those files open or is watching them, you may see file-lock errors or
HMR loops. Stop the dev server first.

**Node.js 22 is used in development but the minimum is 18.**
The `generate.sh` script enforces Node.js >= 18. No Node.js 18 tests are run
in CI.

## Who to contact

<!-- NEEDS CLARIFICATION: team ownership, Slack channel, or issue tracker -->

This tool is maintained by the internal platform team. Report issues, ask
questions, or request new use cases through the team's standard channels.
