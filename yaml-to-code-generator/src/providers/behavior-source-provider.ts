// providers/behavior-source-provider.ts — Abstraction over behavior block sources
// Separates "where blocks come from" from "how they are parsed and used".
//
// Phase 1: EmbeddedSourceProvider — reads from YAML multiline strings
// Future: FileSystemSourceProvider — reads from external .dsl files
// Future: RemoteSourceProvider — reads from URLs or database

export interface BehaviorBlock {
  /** Type of behavior block: workflow, event, decision */
  type: 'workflow' | 'event' | 'decision';
  /** Optional name derived from the block content */
  name?: string;
  /** Raw source text of the behavior block */
  raw: string;
  /** If embedded within an entity, the entity name */
  entityName?: string;
}

export interface BehaviorSourceProvider {
  /** Extract all behavior blocks from a parsed YAML object */
  extract(rawYaml: Record<string, unknown>): BehaviorBlock[];
}

/**
 * Reads behavior blocks embedded as multiline strings in YAML fields.
 *
 * YAML layout:
 *   workflows:
 *     - |
 *       workflow Process { ... }
 *   events:
 *     - |
 *       event TicketCreated { ... }
 *   decisions:
 *     - |
 *       decision Routing { ... }
 */
export class EmbeddedSourceProvider implements BehaviorSourceProvider {
  extract(rawYaml: Record<string, unknown>): BehaviorBlock[] {
    const blocks: BehaviorBlock[] = [];

    // ── Top-level workflow blocks ──
    const workflowArr = rawYaml['workflows'] as string[] | undefined;
    if (Array.isArray(workflowArr)) {
      for (const raw of workflowArr) {
        if (typeof raw === 'string' && raw.trim().length > 0) {
          blocks.push({ type: 'workflow', raw, name: this.guessName(raw, 'workflow') });
        }
      }
    }

    // ── Top-level event blocks ──
    const eventsArr = rawYaml['events'] as string[] | undefined;
    if (Array.isArray(eventsArr)) {
      for (const raw of eventsArr) {
        if (typeof raw === 'string' && raw.trim().length > 0) {
          blocks.push({ type: 'event', raw, name: this.guessName(raw, 'event') });
        }
      }
    }

    // ── Top-level decision blocks ──
    const decisionsArr = rawYaml['decisions'] as string[] | undefined;
    if (Array.isArray(decisionsArr)) {
      for (const raw of decisionsArr) {
        if (typeof raw === 'string' && raw.trim().length > 0) {
          blocks.push({ type: 'decision', raw, name: this.guessName(raw, 'decision') });
        }
      }
    }

    return blocks;
  }

  /**
   * Guess the name of a behavior block from its first token.
   * For example: `workflow MyName { ... }` → `MyName`
   */
  private guessName(raw: string, expectedKeyword: string): string | undefined {
    const trimmed = raw.trim();
    const match = trimmed.match(new RegExp(`^${expectedKeyword}\\s+(\\w+)`));
    return match?.[1] ?? undefined;
  }
}
