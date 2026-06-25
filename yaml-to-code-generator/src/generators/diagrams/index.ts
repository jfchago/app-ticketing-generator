// generators/diagrams/index.ts — PlantUML diagram generator
// Generates class, state, sequence, activity, and use case diagrams from IR
// Falls back to inline generation if EJS template is missing

import { BaseGenerator } from '../base/index.js';
import type { WorkflowDef } from '../../ir/types.js';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const _diagramTemplates = dirname(fileURLToPath(import.meta.url)) + '/templates';

export class DiagramGenerator extends BaseGenerator {
  protected determineSourceRoot(): string {
    return _diagramTemplates;
  }
  writing(): void {
    const ir = this.ir;
    const baseName = ir.application.module;

    // ── Class diagram (always generated) ──
    this.#tryRenderOrInline('class-diagram.puml.ejs', `${baseName}-class-diagram.puml`, {}, () =>
      generateClassDiagram(ir),
    );

    // ── Use case diagram (if use cases exist) ──
    const hasUseCases = ir.entities.some((e) => e.useCases.length > 0);
    if (hasUseCases) {
      this.#tryRenderOrInline(
        'usecase-diagram.puml.ejs',
        `${baseName}-usecase-diagram.puml`,
        {},
        () => generateUseCaseDiagram(ir),
      );
    }

    // ── Activity diagrams (per workflow) ──
    for (const wf of ir.workflows ?? []) {
      this.#tryRenderOrInline(
        'activity-diagram.puml.ejs',
        `workflows/${wf.name}-activity-diagram.puml`,
        { workflow: wf },
        () => generateActivityDiagram(wf),
      );
    }

    // ── Sequence diagrams (per workflow) ──
    for (const wf of ir.workflows ?? []) {
      this.#tryRenderOrInline(
        'sequence-diagram.puml.ejs',
        `workflows/${wf.name}-sequence-diagram.puml`,
        { workflow: wf },
        () => generateSequenceDiagram(wf),
      );
    }

    // ── Use case sequence diagrams (per entity per use case) ──
    for (const entity of ir.entities) {
      for (const uc of entity.useCases) {
        const outDir = `sequences/${entity.nameCamel}`;
        try {
          mkdirSync(this.destinationPath(outDir), { recursive: true });
        } catch {}
        this.renderEjs(
          'use-case-sequence-diagram.puml.ejs',
          `${outDir}/${entity.nameCamel}-${uc.name}-sequence-diagram.puml`,
          { entity, useCase: uc },
        );
      }
    }
  }

  /**
   * Try to render with EJS template; if the template file doesn't exist,
   * fall back to the inline generator function.
   */
  #tryRenderOrInline(
    templateRelPath: string,
    outputRelPath: string,
    extraVars: Record<string, unknown>,
    inlineFn: () => string,
  ): void {
    const templatePath = this.templatePath(templateRelPath);
    try {
      if (this.fs.exists(templatePath)) {
        this.renderEjs(templateRelPath, outputRelPath, extraVars);
      } else {
        this.fs.write(this.destinationPath(outputRelPath), inlineFn());
      }
    } catch {
      this.fs.write(this.destinationPath(outputRelPath), inlineFn());
    }
  }
}

// ── Inline PUML generators (fallback when EJS templates are missing) ──

function generateClassDiagram(ir: any): string {
  const lines: string[] = [];
  lines.push('@startuml ' + ir.application.module + '-class-diagram');
  lines.push('!theme plain');
  lines.push('skinparam classBackgroundColor #FEFEFE');
  lines.push('skinparam classBorderColor #666666');
  lines.push('');
  lines.push('title ' + ir.application.name + ' — Domain Model');
  lines.push('');

  for (const enumDef of ir.enums) {
    lines.push('enum ' + enumDef.namePascal + ' {');
    for (const val of enumDef.values) {
      lines.push('  ' + val.name);
    }
    lines.push('}');
    lines.push('');
  }

  for (const entity of ir.entities) {
    const stereoLabel =
      entity.stereotype === 'aggregate_root'
        ? 'AggregateRoot'
        : entity.stereotype === 'value_object'
          ? 'ValueObject'
          : 'Entity';
    const stereoColor =
      entity.stereotype === 'aggregate_root'
        ? 'orange'
        : entity.stereotype === 'value_object'
          ? 'blue'
          : 'green';
    lines.push(
      'class ' + entity.namePascal + ' << (S,' + stereoColor + ') ' + stereoLabel + ' >> {',
    );
    for (const attr of entity.attributes) {
      let line = '  {field}';
      if (attr.primary) line += ' <<PK>>';
      line += ' ' + attr.name + ' : ' + attr.type;
      if (!attr.nullable) line += ' {not null}';
      if (attr.unique) line += ' {unique}';
      lines.push(line);
    }
    if (entity.useCases.length > 0) {
      lines.push('  --');
      for (const uc of entity.useCases) {
        const retType =
          entity.namePascal + 'DTO' + (['get_all', 'load_users'].includes(uc.name) ? '[]' : '');
        lines.push('  + ' + uc.methodName + '() : ' + retType);
      }
    }
    lines.push('}');
    lines.push('');
  }

  for (const entity of ir.entities) {
    for (const rel of entity.relationships) {
      const arrow = rel.type === 'one_to_many' ? ' *-- ' : ' --> ';
      lines.push(
        entity.namePascal +
          arrow +
          '"' +
          rel.targetCardinality +
          '" ' +
          rel.targetPascal +
          ' : ' +
          rel.name,
      );
    }
  }

  for (const entity of ir.entities) {
    for (const attr of entity.attributes) {
      if (attr.isEnum) {
        lines.push(entity.namePascal + ' --> ' + attr.type);
      }
    }
  }

  lines.push('@enduml');
  return lines.join('\n');
}

function generateUseCaseDiagram(ir: any): string {
  const workflowActors = new Set(
    (ir.workflows ?? []).flatMap((w: any) => (w.participants ?? []).map((p: any) => p.name)),
  );
  const actors = workflowActors.size > 0 ? [...workflowActors] : ['User'];
  const lines: string[] = [];
  lines.push('@startuml ' + ir.application.module + '-usecase-diagram');
  lines.push('!theme plain');
  lines.push('title ' + ir.application.name + ' — Use Cases');
  lines.push('');
  lines.push('left to right direction');

  for (const actor of actors) {
    lines.push('actor "' + actor + '" as ' + actor);
  }
  lines.push('');

  lines.push('rectangle "' + ir.application.name + '" {');
  for (const entity of ir.entities) {
    lines.push('  note as ' + entity.namePascal + '_Note');
    lines.push('    ' + entity.description);
    lines.push('  end note');
    for (const uc of entity.useCases) {
      const label = uc.httpMethod + ' /api/' + entity.nameKebab + 's' + uc.pathSuffix;
      lines.push('  usecase "' + label + '" as UC_' + entity.namePascal + '_' + uc.namePascal);
      for (const actor of actors) {
        lines.push('  ' + actor + ' --> UC_' + entity.namePascal + '_' + uc.namePascal);
      }
    }
  }

  lines.push('}');
  lines.push('@enduml');
  return lines.join('\n');
}

function generateActivityDiagram(wf: WorkflowDef): string {
  const lines: string[] = [];
  lines.push('@startuml ' + wf.name + '-activity-diagram');
  lines.push('!theme plain');
  lines.push('title ' + wf.name + ' — Activity Flow');
  lines.push('');
  lines.push('start');

  let prevActor = '';
  for (const step of wf.steps) {
    if (step.actorName && step.actorName !== prevActor) {
      lines.push('|#' + step.actorName + '|');
      prevActor = step.actorName;
    }

    if (step.type === 'gateway') {
      lines.push('if (' + (step.label || step.id) + ') then');
    } else if (step.type === 'timer') {
      lines.push(
        ':⏱ ' +
          (step.label || step.id) +
          (step.timerExpression ? ' (' + step.timerExpression + ')' : '') +
          ';',
      );
    } else if (step.transitions.length > 1 || step.transitions.some((t) => t.condition)) {
      lines.push('if (' + (step.label || step.id) + ') then');
      for (const t of step.transitions.filter((ti) => !ti.isDefault)) {
        lines.push(
          '  -> ' +
            (t.condition ? '[' + t.condition + '] ' : '') +
            ': ' +
            (t.label || t.targetStep) +
            ';',
        );
        if (wf.endSteps.includes(t.targetStep)) {
          lines.push('  -> stop');
        }
      }
      const defaultT = step.transitions.find((t) => t.isDefault);
      if (defaultT) {
        lines.push('else (' + (defaultT.label || 'default') + ')');
        lines.push('  -> :' + (defaultT.targetStep || 'end') + ';');
        if (wf.endSteps.includes(defaultT.targetStep)) {
          lines.push('  -> stop');
        }
      }
      lines.push('endif');
    } else {
      lines.push(':' + (step.label || step.id) + ';');
    }

    for (const action of step.actions) {
      lines.push(':' + action.type + (action.target ? ' ' + action.target : '') + ';');
    }

    if (
      step.type !== 'gateway' &&
      !(step.transitions.length > 1 || step.transitions.some((t) => t.condition))
    ) {
      if (wf.endSteps.includes(step.id)) {
        lines.push('stop');
      }
    }

    if (step.timerExpression && step.type !== 'timer') {
      lines.push('... after ' + step.timerExpression + ' ...');
    }
  }

  lines.push('@enduml');
  return lines.join('\n');
}

function generateSequenceDiagram(wf: WorkflowDef): string {
  const lines: string[] = [];
  lines.push('@startuml ' + wf.name + '-sequence-diagram');
  lines.push('!theme plain');
  lines.push('title ' + wf.name + ' — Interaction Sequence');
  lines.push('');

  for (const p of wf.participants) {
    lines.push('actor "' + p.name + '" as ' + p.name + ' << ' + p.role + ' >>');
  }
  lines.push('participant System');
  lines.push('');
  lines.push('== ' + wf.name + ' ==');
  lines.push('');

  for (const step of wf.steps) {
    if (step.type === 'gateway') {
      lines.push('alt [' + (step.label || step.id) + ']');
    } else if (step.transitions.length > 1 || step.transitions.some((t) => t.condition)) {
      lines.push('alt [' + (step.label || step.id) + ']');
      for (const t of step.transitions.filter((ti) => !ti.isDefault)) {
        lines.push('  alt ' + (t.condition ? '[' + t.condition + ']' : ''));
        for (const action of step.actions) {
          const sender = (action.params as any)?.actor || step.actorName || 'System';
          lines.push(
            '  ' +
              sender +
              ' -> ' +
              (sender === 'System' ? action.target || 'System' : 'System') +
              ' : ' +
              ((action.params as any)?.verb || action.type),
          );
        }
        lines.push('  end');
      }
      const defaultT = step.transitions.find((t) => t.isDefault);
      if (defaultT) {
        lines.push('  else [' + (defaultT.condition || 'default') + ']');
        for (const action of step.actions) {
          const sender = (action.params as any)?.actor || step.actorName || 'System';
          lines.push(
            '  ' +
              sender +
              ' -> ' +
              (action.target || 'System') +
              ' : ' +
              ((action.params as any)?.verb || action.type),
          );
        }
        lines.push('  end');
      }
      lines.push('end');
    } else {
      lines.push('group ' + (step.label || step.id));
      for (const action of step.actions) {
        const sender = (action.params as any)?.actor || step.actorName || 'System';
        lines.push(
          sender +
            ' -> ' +
            (action.target || 'System') +
            ' : ' +
            ((action.params as any)?.verb || action.type),
        );
      }
      if (step.timerExpression) {
        lines.push('... after ' + step.timerExpression + ' ...');
      }
      lines.push('end');
    }
  }

  lines.push('@enduml');
  return lines.join('\n');
}
