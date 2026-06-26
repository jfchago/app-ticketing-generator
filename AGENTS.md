# AGENTS.md

## Project overview

Learning/design repo for a DSL-driven code generator. Contains:

- **`yaml-to-code-generator/`** — parse YAML DSL + behavior blocks → generate code via Yeoman
- **`vue-poc-agents/`** — a Vue 3 + TS Mini HelpDesk PoC (can be regenerated from YAML)
- **`spring-backend/`** — a Spring Boot 3 REST API (generated from the same YAML)
- **`specs/`** — YAML DSL specs (`*.yaml`) and PlantUML diagrams (`*.puml`)
- Root `*.md` — learning plans (English/Spanish); design docs, not executable

## The YAML DSL is the single source of truth

All code is generated from `yaml-to-code-generator/specs/helpdesk.yaml`. The same YAML produces:

- Vue 3 + TypeScript domain layer (types, stores, components, views)
- Spring Boot 3 REST backend (entities, repos, services, controllers)
- PlantUML class, state, sequence, activity, and use case diagrams

To change anything about the domain, edit the YAML and regenerate. Never hand-edit generated code.

Behavior blocks (state machines, workflows, events, decisions, rules) are optional.
If the YAML has no behavior blocks, output is identical to v1.

## Commands

### Vue PoC (`vue-poc-agents/`)

```
npm run dev       # Vite dev server (HMR)
npm run build     # vue-tsc -b && vite build  (type-check FIRST, then bundle)
npm run preview   # Serve production build from dist/
```

There is no separate `lint`, `test`, or `format` command for the Vue app.

### Generator (`yaml-to-code-generator/`)

**Wrapper script (recommended):**

```
./generate.sh generate --spec specs/helpdesk.yaml --target vue --output ../generated-repos/vue-poc-agents
./generate.sh generate --spec specs/helpdesk.yaml --target spring --output ../generated-repos/spring-backend
./generate.sh generate --spec specs/helpdesk.yaml --target spring --build-tool maven --output ../generated-repos/spring-backend
./generate.sh generate --spec specs/helpdesk.yaml --target diagrams --output ../specs/diagrams
./generate.sh validate --spec specs/helpdesk.yaml
./generate.sh validate --spec specs/helpdesk.yaml --strict-behavior
./generate.sh puml-to-yaml --input ../specs/05_recepcion_solicitudes.puml --output output.yaml
./generate.sh yaml-to-diagrams --spec specs/helpdesk.yaml --output ../specs/diagrams
```

**Direct TypeScript CLI:**

```
npx tsx src/cli.ts generate -s <yaml> -t <vue|spring|diagrams> -o <dir> [-d|--dry-run]
npx tsx src/cli.ts generate -s <yaml> -t spring --build-tool maven -o <dir>
npx tsx src/cli.ts validate -s <yaml>
npx tsx src/cli.ts validate -s <yaml> --strict-behavior
npx tsx src/cli.ts puml-to-yaml -i <.puml> -o <.yaml>
npx tsx src/cli.ts yaml-to-diagrams -s <.yaml> -o <.dir>
npx tsx src/cli.ts inspect -s <yaml> --stage <raw|validated|semantic|ir|vue-model|spring-model>
```

**npm scripts (from `yaml-to-code-generator/`):**

```
npm run generate -- -s specs/helpdesk.yaml -t vue -o ../generated-repos/vue-poc-agents
npm run validate -- -s specs/helpdesk.yaml
```

### Spring Backend (`spring-backend/`) — requires Java 17+

```
./gradlew bootRun       # Start on http://localhost:8080 (Gradle)
mvn spring-boot:run     # Start on http://localhost:8080 (Maven)
./gradlew build         # Compile (Gradle)
mvn compile             # Compile (Maven)
./gradlew test          # Run tests (Gradle)
mvn test                # Run tests (Maven)
```

## TypeScript strictness (vue-poc-agents)

`tsconfig.app.json` enforces these at type-check time (no separate lint step):

- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `erasableSyntaxOnly: true`
- `noFallthroughCasesInSwitch: true`

Unused imports/variables will fail `npm run build`.

## Architecture

### YAML-to-Code Generator pipeline (v2)

```
YAML DSL
  ├── js-yaml parser → RawSpec (structural: entities, enums, relationships)
  ├── Zod validator → ValidatedSpec (type checking)
  ├── Behavior extractor → BehaviorBlock[] (stateMachine, workflow, event, decision, rule, validate, error)
  ├── Chevrotain parser → BehaviorAST[] (parsed behavior blocks)
  ├── AST validator → ValidatedAST (cross-references)
  ├── IR builder v2 → IR (merged structural + behavioral)
  └── Yeoman generators → files
        ├── vue/ → TS + Vue SFC files (types, stores, components, views)
        ├── spring/ → Java + Spring Boot + events
        └── diagrams/ → PlantUML (class, state, sequence, activity, use case)
```

Key source files in `yaml-to-code-generator/src/`:

- `cli.ts` — Commander-based CLI entry point
- `parser/yaml-parser.ts` — js-yaml wrapper
- `providers/behavior-source-provider.ts` — BehaviourSourceProvider interface + EmbeddedSourceProvider
- `validator/schema-validator.ts` — Zod schemas for structural validation
- `validator/semantic-validator.ts` — cross-reference and business-rule checks
- `lang/tokens.ts` — Chevrotain lexer token definitions
- `lang/lexer.ts` — Chevrotain Lexer
- `lang/parser.ts` — 7 mini-parsers (stateMachine, workflow, event, decision, rule, validate, error)
- `lang/ast-types.ts` — Behavior AST interfaces
- `lang/ast-builder.ts` — CST → AST transformer
- `lang/ast-validator.ts` — Behavior AST semantic validation
- `ir/types.ts` — IR v2 type definitions (language-agnostic, includes WorkflowDef, StateMachineDef, EventDef, etc.)
- `ir/builder.ts` — Structural IR builder + behavioral IR merge
- `ir/use-case-resolver.ts` — maps use case names → method names, HTTP methods
- `generator/orchestrator.ts` — main pipeline: parse → validate → IR → Yeoman dispatch
- `generators/base/index.ts` — Yeoman BaseGenerator (all targets extend)
- `generators/vue/index.ts` — Vue target generator
- `generators/spring/index.ts` — Spring target generator
- `generators/diagrams/index.ts` — Diagram generator (PUML class, state, sequence, activity, use case)

### Vue PoC architecture

Layered DDD-lite pattern:

```
src/
  domain/            # Types, repository interfaces, service classes
    ticket/
    user/
    comment/
  infrastructure/    # HTTP client + repository implementations
    api-client.ts    # Axios instance (baseURL: /api)
    repositories/    # *.repository.impl.ts — calls Spring REST API
  stores/            # Pinia stores (ticket.store.ts, user.store.ts)
  components/        # Vue SFC components
  views/             # Route-level views
  app/router/        # Vue Router config
```

- **No more fake API** — the `infrastructure/fake-api/` directory is removed. Repository implementations use `axios` to call the Spring backend at `/api/*`.
- **Vite proxy** — `vite.config.ts` proxies `/api` → `http://localhost:8080` during dev, so no CORS issues.
- **Not generated** — `main.ts`, `App.vue`, `vite.config.ts`, `package.json`, `tsconfig*.json`, `index.html` are hand-authored. See `docs/10-operations.md` for the full list.
- State management: Pinia (Options API style stores)
- Router: Vue Router with lazy-loaded detail/create views

### Spring Backend architecture

```
src/main/java/com/helpdesk/
├── MiniHelpDeskApplication.java
├── entity/          # JPA @Entity classes (Lombok @Data)
├── repository/      # Spring Data JPA repositories
├── service/         # @Service classes (business logic)
├── controller/      # @RestController classes (REST API at /api/*)
└── config/          # CORS config
```

- **H2 in-memory DB** (ready to switch to PostgreSQL — see `application.properties` comments)
- **Lombok** for boilerplate reduction
- **Gradle** or **Maven** build system (via `--build-tool` flag)
- REST endpoints are derived from YAML use cases (e.g., `get_all` → `GET /api/tickets`)

## Generator quirks

- EJS 3.x `strict` mode does NOT work with data variables — `ir` becomes inaccessible. The renderer intentionally does NOT use `strict: true`. Instead, it uses `with()`-based rendering.
- Generated file paths use `entity.nameCamel` (lowercase) for directories. PascalCase is reserved for type names and class names only.
- Yeoman's mem-fs writes files as-is. Use EJS trim-mode tags (`<%_ ... _%>`) in templates to control whitespace.
- Templates that don't exist are silently skipped (no error).
- The `use-case-resolver.ts` is the central registry of known use cases. Add new ones there to support them across ALL template packs.
- `ir.application.appClassName` is the app's name with non-alphanumeric chars stripped (e.g., `"Mini HelpDesk"` → `"MiniHelpDesk"`). Use this, not `pascalCase(ir.application.name)`, for Java class names to avoid case mismatches.
- Behavior blocks are optional. If no behavior blocks are found, the Chevrotain parse stage is skipped entirely and v1 output is identical.
- The `BehaviorSourceProvider` interface separates where blocks come from (embedded YAML strings, external `.dsl` files, etc.) from how they are parsed and used. This enables future migration to external DSL files.
- **EJS `<%=` vs `<%-`**: Use `<%-` (raw output) for values containing quotes (labels, messages). `<%=` HTML-escapes single quotes to `&#39;`.
- **Action verb persistence**: The AST builder stores action verbs (e.g., `crearTicket`) in `ActionDef.params.verb` and actor role in `params.actor/role`. Templates can access `action.params.verb` to generate service dispatches. Non-mapped verbs default to `call_service` type.
- **Rule conditions**: The rule `when{}` block supports `guard: "expression"` for condition evaluation. The expression is injected as-is into generated code (JS for Vue, Java for Spring).

## Behavior blocks (v2)

Behavior blocks are optional multiline strings inside YAML that define:

| Block type | DSL keyword | Where it can appear | Generated output                                              | Status                        |
| ---------- | ----------- | ------------------- | ------------------------------------------------------------- | ----------------------------- |
| Workflow   | `workflows` | Top-level array     | Activity/sequence diagrams (diagrams target only)             | Diagram output only           |
| Event      | `events`    | Top-level array     | `ApplicationEventPublisher` classes and listener (Spring)     | Functional (Spring only)      |
| Decision   | `decisions` | Top-level array     | None — parsed into IR but no code or diagram output           | Design-time artifact only     |

**Transitions & Rules** are now plain YAML fields (not DSL strings), see `specs/helpdesk.yaml` for examples.

Key characteristics of behavioral code generation:

- **Rules now evaluate conditions**: `guard: "entity.comments.length === 0"` generates `check*()` functions returning the condition in both Vue (Pinia store) and Spring (service). The `entity` variable in the DSL is replaced with the actual entity name (e.g., `ticket`).
- **Actions preserve verbs**: The AST builder stores `action.params.verb` = `"crearTicket"`, `action.params.role` = `"user"`/`"system"`, `action.params.actor` = `"Usuario"` so templates can generate role-aware dispatch code.
- **Event listeners (Spring)**: A single `@Component` class (`AppEventListener`) is generated with `@EventListener` methods for every event type. Events can be published and consumed within the application.

See `docs/11-behavior-dsl-reference.md` for full grammar reference.

## Behavioral templates reference per target

### Vue target

| Template path                        | Context                    | What it generates                                                                                                                                                                                                                                                                                       |
| ------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stores/entity.store.ts.ejs`         | `{ entity }`               | Pinia store with inline state machine transition table (`VALID_TRANSITIONS`), `check*()` rule guard functions (from `rules:` in YAML), and guarded CRUD mutation actions. Rules and transitions are generated inline within this template, not as separate files.                                       |

### Spring target

| Template path                              | Context                    | What it generates                                         |
| ------------------------------------------ | -------------------------- | --------------------------------------------------------- |
| `event/Event.java.ejs`                     | `{ event }`                | Event class with payload fields                           |
| `event/EventPublisher.java.ejs`            | `{ event }`                | `ApplicationEventPublisher` wrapper                       |
| `event/EventListener.java.ejs`             | `{}` (reads all ir.events) | `@Component` with `@EventListener` methods for all events |

## Add new use cases

1. Add the use case mapping to `ir/use-case-resolver.ts` — define methodName, httpMethod, pathSuffix
2. Add handling logic in the Vue template: `domain/entity.repository.ts.ejs`, `domain/entity.service.ts.ejs`, `stores/entity.store.ts.ejs`, etc. Add any validation rules to the entity's `rules:` array in the YAML.
3. Add handling logic in the Spring template: `controller/EntityController.java.ejs`, `service/EntityService.java.ejs`
4. Re-run `./generate.sh` to verify

## Add new target language

1. Create `src/generators/yourlang/index.ts` extending `BaseGenerator`
2. Create templates in `src/generators/yourlang/templates/`
3. Register in `src/generator/orchestrator.ts` `GENERATOR_MAP`
4. Add to CLI help text

## Add new behavior type

1. Add token definitions in `src/lang/tokens.ts`
2. Add parser rule in `src/lang/parser.ts`
3. Add AST builder in `src/lang/ast-builder.ts`
4. Add IR type in `src/ir/types.ts`
5. Add AST → IR mapping in `src/ir/builder.ts`
6. Add templates in target generators
7. Add grammar documentation in `docs/11-behavior-dsl-reference.md`

## Templates reference

Each template receives `{ ir, entity?, enumDef? }` context:

- `ir` — full Intermediate Representation (all entities, enums, app info)
- `entity` — current entity (for per-entity templates; undefined for global templates)
- `enumDef` — current enum definition (for `enum/Enum.java.ejs`; undefined otherwise)
- Helper functions: `camelCase`, `pascalCase`, `kebabCase`, `snakeCase`, `pluralize`, `upperCase`, `lowerCase`, `indent`

For behavior templates, additional context may include `event` where applicable. See `docs/05-template-authoring.md` for details.

## Known limitations

- **Workflows produce diagrams only** — The workflow DSL (`workflows:` in YAML) generates activity and sequence diagrams via the diagrams target. No workflow orchestrator code is generated in Vue or Spring targets.
- **Decisions have no output** — The decision DSL (`decisions:` in YAML) defines strategy branches but produces neither code nor diagrams in any target. Decisions are a design-time artifact only.
- **Vue has no event handling** — Events are wired only in the Spring target (event classes, publishers, `@EventListener`). The Vue target produces no event handling code. Event payloads are parsed and stored in the IR but no Vue code is generated from them.
- **State machine transitions and rule guards are inlined** — They appear inside Pinia store actions (Vue) and service methods (Spring) rather than as standalone configuration or validation files. This keeps the generated code self-contained but means there is no central state machine configuration to inspect.
