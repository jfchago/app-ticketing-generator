import { describe, it, expect } from "vitest";
import { parseBehaviorBlock } from "./ast-builder.js";

// ── Helpers ──────────────────────────────────────────────────────────

function parse(type: string, src: string) {
  return parseBehaviorBlock(type, src);
}

function expectError(type: string, src: string) {
  expect(() => parse(type, src)).toThrow();
}
// ── Workflow edge cases ──────────────────────────────────────────────

describe("Workflow parsing", () => {
  it("parses workflow with no participants", () => {
    const ast = parse(
      "workflow",
      `
      workflow NoParticipants {
        start -> step1;
        step step1 {
          System does doSomething;
        }
        end step1;
      }
    `,
    );
    if (ast.kind !== "Workflow") return;
    expect(ast.participants).toHaveLength(0);
    expect(ast.steps).toHaveLength(1);
  });

  it("parses workflow with no start step", () => {
    const ast = parse(
      "workflow",
      `
      workflow NoStart {
        actor User;
        step step1 {
          User does doSomething;
        }
        end step1;
      }
    `,
    );
    if (ast.kind !== "Workflow") return;
    expect(ast.startStep).toBe("");
  });

  it("parses workflow with no end step", () => {
    const ast = parse(
      "workflow",
      `
      workflow NoEnd {
        actor User;
        start -> step1;
        step step1 {
          User does doSomething;
        }
      }
    `,
    );
    if (ast.kind !== "Workflow") return;
    expect(ast.endSteps).toHaveLength(0);
  });

  it("parses workflow with empty step (no content)", () => {
    const ast = parse(
      "workflow",
      `
      workflow EmptyStep {
        start -> step1;
        step step1: "A label" {
        }
        end step1;
      }
    `,
    );
    if (ast.kind !== "Workflow") return;
    expect(ast.steps[0].actions).toHaveLength(0);
    expect(ast.steps[0].label).toBe("A label");
  });

  it("parses workflow step with label containing special chars", () => {
    const ast = parse(
      "workflow",
      `
      workflow LabelTest {
        start -> s1;
        step s1: "Step with 'quotes' and spaces!" {
          System does doThing;
        }
        end s1;
      }
    `,
    );
    if (ast.kind !== "Workflow") return;
    expect(ast.steps[0].label).toBe("Step with 'quotes' and spaces!");
  });

  it("parses workflow with if/else decision block", () => {
    const ast = parse(
      "workflow",
      `
      workflow DecisionTest {
        actor User;
        start -> step1;
        step step1: "Decision step" {
          if SomeCondition {
            User does doThis;
          }
          else {
            System does doThat;
          }
        }
        end step1;
      }
    `,
    );
    if (ast.kind !== "Workflow") return;
    expect(ast.steps[0].actions).toHaveLength(2);
  });

  it("parses workflow with await statement", () => {
    const ast = parse(
      "workflow",
      `
      workflow AwaitTest {
        start -> step1;
        step step1 {
          await SomeEvent;
        }
        end step1;
      }
    `,
    );
    if (ast.kind !== "Workflow") return;
    // await statements don't produce actions directly
    expect(ast.steps[0].actions).toHaveLength(0);
  });

  it("parses workflow with timer (after) block", () => {
    const ast = parse(
      "workflow",
      `
      workflow TimerTest {
        start -> step1;
        step step1 {
          after 1h {
            System does escalate;
          }
        }
        end step1;
      }
    `,
    );
    if (ast.kind !== "Workflow") return;
    expect(ast.steps[0].actions).toHaveLength(1);
  });
});

// ── Event edge cases ─────────────────────────────────────────────────

describe("Event parsing", () => {
  it("parses an event with no source", () => {
    const ast = parse(
      "event",
      `
      event ticketCreated {
        payload {
          ticketId: string @required;
          title: string;
        }
      }
    `,
    );
    if (ast.kind !== "Event") return;
    expect(ast.source).toBeUndefined();
    expect(ast.payload).toHaveLength(2);
  });

  it("parses an event with no payload", () => {
    const ast = parse(
      "event",
      `
      event ticketCreated {
        source: TicketSystem;
        handlers: [logTicket, notifyUser];
      }
    `,
    );
    if (ast.kind !== "Event") return;
    expect(ast.payload).toHaveLength(0);
    expect(ast.handlers).toEqual(["logTicket", "notifyUser"]);
  });

  it("parses an event with no handlers", () => {
    const ast = parse(
      "event",
      `
      event ticketCreated {
        source: TicketSystem;
        payload {
          ticketId: string;
        }
      }
    `,
    );
    if (ast.kind !== "Event") return;
    expect(ast.handlers).toHaveLength(0);
  });

  it("parses an event with only source (empty payload and handlers)", () => {
    const ast = parse(
      "event",
      `
      event ticketCreated {
        source: TicketSystem;
      }
    `,
    );
    if (ast.kind !== "Event") return;
    expect(ast.source).toBe("TicketSystem");
    expect(ast.payload).toHaveLength(0);
    expect(ast.handlers).toHaveLength(0);
  });

  it("parses an event with empty payload block", () => {
    const ast = parse(
      "event",
      `
      event ticketCreated {
        payload {
        }
      }
    `,
    );
    if (ast.kind !== "Event") return;
    expect(ast.payload).toHaveLength(0);
  });

  it("parses an event with multiple handlers", () => {
    const ast = parse(
      "event",
      `
      event ticketCreated {
        handlers: [h1, h2, h3, h4, h5];
      }
    `,
    );
    if (ast.kind !== "Event") return;
    expect(ast.handlers).toEqual(["h1", "h2", "h3", "h4", "h5"]);
  });
});

// ── Decision edge cases ──────────────────────────────────────────────
describe("Decision parsing", () => {
  it("parses a decision with no input", () => {
    const ast = parse(
      "decision",
      `
      decision priorityDecision {
        when Urgente {
          System does assignPriority;
        }
        else {
          System does assignPriority;
        }
      }
    `,
    );
    if (ast.kind !== "Decision") return;
    expect(ast.input).toBeUndefined();
    expect(ast.cases).toHaveLength(1);
    expect(ast.defaultActions).toHaveLength(1);
  });

  it("parses a decision with no when clauses", () => {
    const ast = parse(
      "decision",
      `
      decision alwaysDefault {
        input: SomeInput;
        else {
          System does log;
        }
      }
    `,
    );
    if (ast.kind !== "Decision") return;
    expect(ast.cases).toHaveLength(0);
    expect(ast.defaultActions).toHaveLength(1);
  });

  it("parses a decision with no else clause", () => {
    const ast = parse(
      "decision",
      `
      decision noElse {
        input: Score;
        when High {
          System does reward;
        }
        when Medium {
          System does reward;
        }
      }
    `,
    );
    if (ast.kind !== "Decision") return;
    expect(ast.cases).toHaveLength(2);
    expect(ast.defaultActions).toHaveLength(0);
  });

  it("parses a decision with empty when clause (no actions)", () => {
    const ast = parse(
      "decision",
      `
      decision emptyWhen {
        input: X;
        when Something {
        }
        else {
          System does fallback;
        }
      }
    `,
    );
    if (ast.kind !== "Decision") return;
    expect(ast.cases[0].actions).toHaveLength(0);
  });

  it("parses a decision with multiple when clauses", () => {
    const ast = parse(
      "decision",
      `
      decision multiWhen {
        input: Priority;
        when Low {
          System does setPriority;
        }
        when Medium {
          System does setPriority;
        }
        when High {
          System does setPriority;
        }
        when Critical {
          System does setPriority;
          System does notify Manager;
        }
        else {
          System does setPriority;
        }
      }
    `,
    );
    if (ast.kind !== "Decision") return;
    expect(ast.cases).toHaveLength(4);
    expect(ast.cases[3].actions).toHaveLength(2);
    expect(ast.defaultActions).toHaveLength(1);
  });
});

// ── Cross-block edge cases ───────────────────────────────────────────

describe("Cross-block edge cases", () => {
  it("throws for unknown block type", () => {
    expectError("unknown", "some random text");
  });

  it("throws for malformed source (unclosed brace)", () => {
    expectError(
      "workflow",
      `
      workflow "bad" {
        actor User;
        start -> step1;
        step step1: "Step 1" {
          User does something;
    `,
    );
  });

  it("throws for completely empty source", () => {
    expectError("workflow", "");
  });

  it("throws for source with only whitespace", () => {
    expectError("workflow", "   \n  \t  ");
  });
});
