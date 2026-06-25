// lang/ast-builder.ts — CST → AST transformer for behavior DSL blocks
// Walks Chevrotain's Concrete Syntax Tree and produces typed AST nodes

import type { CstNode, CstElement, IToken } from "chevrotain";
import type {
  BehaviorAST,
  SourceLocation,
  WorkflowAST,
  WorkflowStepAST,
  ActionAST,
  EventAST,
  DecisionAST,
  ParticipantAST,
} from "./ast-types.js";
import { tokenize } from "./lexer.js";
import { parser } from "./parser.js";

/** Main entry: parse a behavior block source string into a BehaviorAST */
export function parseBehaviorBlock(type: string, source: string): BehaviorAST {
  const lexResult = tokenize(source);
  parser.input = lexResult.tokens;

  let cstResult: CstNode | undefined;

  switch (type) {
    case "workflow":
      cstResult = parser.workflowBlock();
      break;
    case "event":
      cstResult = parser.eventBlock();
      break;
    case "decision":
      cstResult = parser.decisionBlock();
      break;
    default:
      throw new Error(`Unknown behavior block type: ${type}`);
  }

  if (parser.errors.length > 0) {
    const msgs = parser.errors.map((e) => e.message).join("\n");
    throw new Error(`Chevrotain parse error(s):\n${msgs}`);
  }

  return buildAST(cstResult!);
}

function withLoc<T extends { loc?: SourceLocation }>(cst: CstNode, obj: T): T {
  obj.loc = extractLoc(cst);
  return obj;
}

function buildAST(cst: CstNode): BehaviorAST {
  const name = cst.name;

  const kindMap: Record<string, BehaviorAST["kind"]> = {
    workflowBlock: "Workflow",
    eventBlock: "Event",
    decisionBlock: "Decision",
  };

  const kind = kindMap[name];
  if (!kind) throw new Error(`Unknown CST node: ${name}`);

  switch (kind) {
    case "Workflow":
      return withLoc(cst, buildWorkflow(cst));
    case "Event":
      return withLoc(cst, buildEvent(cst));
    case "Decision":
      return withLoc(cst, buildDecision(cst));
  }
}

// ── Workflow builder ─────────────────────────────────────────────────

function buildWorkflow(cst: CstNode): WorkflowAST {
  const children = cst.children;
  const name = childValue(children, "Identifier", 0) ?? "unnamed";
  const participants: ParticipantAST[] = [];
  const steps: WorkflowStepAST[] = [];
  const endSteps: string[] = [];
  let startStep = "";

  // Traverse: workflowBlock → wfBody
  const bodyNode = (children.wfBody as CstNode[])?.[0];
  if (bodyNode) {
    const body = bodyNode.children;

    // Participants: wfBody → wfParticipants → wfParticipant[]
    const wfParticipants = body.wfParticipants as CstNode[] | undefined;
    if (wfParticipants && wfParticipants.length > 0) {
      const participantNodes = wfParticipants[0].children.wfParticipant ?? [];
      for (const node of participantNodes) {
        const p = buildParticipant(node as CstNode);
        if (p) participants.push(p);
      }
    }

    // Start: wfBody → wfStart → Identifier
    const wfStart = body.wfStart as CstNode[] | undefined;
    if (wfStart && wfStart.length > 0) {
      startStep = childValue(wfStart[0].children, "Identifier", 0) ?? "";
    }

    // Steps: wfBody → wfSteps → wfStep[]
    const wfSteps = body.wfSteps as CstNode[] | undefined;
    if (wfSteps && wfSteps.length > 0) {
      const stepNodes = wfSteps[0].children.wfStep ?? [];
      for (const node of stepNodes) {
        steps.push(buildWorkflowStep(node as CstNode));
      }
    }

    // End: wfBody → wfEnd → Identifier
    const wfEnd = body.wfEnd as CstNode[] | undefined;
    if (wfEnd && wfEnd.length > 0) {
      const endName = childValue(wfEnd[0].children, "Identifier", 0);
      if (endName) endSteps.push(endName);
    }
  }

  return {
    kind: "Workflow",
    name,
    participants,
    steps,
    startStep,
    endSteps,
  };
}

function buildParticipant(cst: CstNode): ParticipantAST | null {
  const children = cst.children;

  let role: "actor" | "system" | "external" = "actor";
  let name = "";

  const actorNode = children.wfActor as CstNode[] | undefined;
  if (actorNode && actorNode.length > 0) {
    name = childValue(actorNode[0].children, "Identifier", 0) ?? "";
  }

  const sysNode = children.wfSys as CstNode[] | undefined;
  if (sysNode && sysNode.length > 0) {
    name = childValue(sysNode[0].children, "Identifier", 0) ?? "";
    role = "system";
  }

  const extNode = children.wfExt as CstNode[] | undefined;
  if (extNode && extNode.length > 0) {
    name = childValue(extNode[0].children, "Identifier", 0) ?? "";
    role = "external";
  }

  if (!name) return null;
  return { role, name };
}

function buildWorkflowStep(cst: CstNode): WorkflowStepAST {
  const children = cst.children;
  const name = childValue(children, "Identifier", 0) ?? "unnamed";

  // Label is from wfStepLabel sub-rule
  let label: string | undefined;
  const stepLabel = children.wfStepLabel;
  if (stepLabel && stepLabel.length > 0) {
    const raw = childValue(
      (stepLabel[0] as CstNode).children,
      "StringLiteral",
      0,
    );
    if (raw) label = raw.replace(/^"/, "").replace(/"$/, "");
  }

  // Step content: wfStepContentSection → wfStepContent[] → actionStatement/wfDecisionStatement/etc
  const actions: ActionAST[] = [];
  const contentSection = children.wfStepContentSection as CstNode[] | undefined;
  if (contentSection && contentSection.length > 0) {
    const contents = contentSection[0].children.wfStepContent ?? [];
    for (const content of contents) {
      const cn = content as CstNode;
      const actionStmt = cn.children.actionStatement as CstNode[] | undefined;
      if (actionStmt && actionStmt.length > 0) {
        const a = buildActionFromStatement(actionStmt[0]);
        if (a) actions.push(a);
        continue;
      }
      // Flatten actions from nested if/else, await, after blocks
      const decisionStmt = cn.children.wfDecisionStatement as
        | CstNode[]
        | undefined;
      if (decisionStmt && decisionStmt.length > 0) {
        const da = extractActionsFromDecision(decisionStmt[0]);
        actions.push(...da);
        continue;
      }
      const awaitStmt = cn.children.wfAwaitStatement as CstNode[] | undefined;
      if (awaitStmt && awaitStmt.length > 0) {
        // Await statements don't produce actions directly, but mark as wait
        continue;
      }
      const timerStmt = cn.children.wfTimerStatement as CstNode[] | undefined;
      if (timerStmt && timerStmt.length > 0) {
        const ta = extractActionsFromTimer(timerStmt[0]);
        actions.push(...ta);
        continue;
      }
    }
  }

  return {
    kind: "WorkflowStep",
    id: name,
    name,
    label,
    type: "task",
    actions,
    transitions: [],
    errorHandlers: [],
  };
}

function buildActionFromStatement(cst: CstNode): ActionAST | null {
  const children = cst.children;
  const verb = childValue(children, "Identifier", 0) ?? "";
  const target = childValue(children, "Identifier", 1);

  // Preserve actor role so templates can generate role-aware dispatch
  const actorRoles: Record<string, string> = {};
  const actorNode = children.actionActor as CstNode[] | undefined;
  if (actorNode && actorNode.length > 0) {
    const actorChildren = actorNode[0].children;
    const sysNode = actorChildren.wfSys as CstNode[] | undefined;
    if (sysNode && sysNode.length > 0) {
      actorRoles.role = "system";
      actorRoles.actor = childValue(sysNode[0].children, "Identifier", 0) ?? "";
    } else {
      actorRoles.role = "user";
      actorRoles.actor =
        childValue(actorChildren, "Identifier", 0) ??
        childValue(actorChildren, "Actor", 0) ??
        "";
    }
  }

  const typeMap: Record<string, ActionAST["type"]> = {
    create: "create",
    update: "update",
    delete: "delete",
    notify: "notify",
    emit: "emit_event",
    call: "call_service",
    set: "assign",
    assign: "assign",
    validate: "validate",
    log: "log",
    schedule: "schedule",
    queue: "assign",
    escalate: "notify",
  };

  return {
    type: typeMap[verb] || "call_service",
    target: target || verb,
    params: { verb, ...actorRoles },
  };
}

function extractActionsFromDecision(cst: CstNode): ActionAST[] {
  const actions: ActionAST[] = [];
  const children = cst.children;
  // Collect actions from the if-true branch
  const trueActions = collectActionsFromNode(
    children.actionStatement as CstNode[] | undefined,
  );
  actions.push(...trueActions);
  // Collect actions from the else branch
  const elseClause = children.wfElseClause as CstNode[] | undefined;
  if (elseClause && elseClause.length > 0) {
    const elseActions = collectActionsFromNode(
      elseClause[0].children.actionStatement as CstNode[] | undefined,
    );
    actions.push(...elseActions);
  }
  return actions;
}

function extractActionsFromTimer(cst: CstNode): ActionAST[] {
  return collectActionsFromNode(
    cst.children.actionStatement as CstNode[] | undefined,
  );
}

function collectActionsFromNode(
  actionStatements: CstNode[] | undefined,
): ActionAST[] {
  if (!actionStatements) return [];
  const actions: ActionAST[] = [];
  for (const stmt of actionStatements) {
    const a = buildActionFromStatement(stmt as CstNode);
    if (a) actions.push(a);
  }
  return actions;
}

// ── Event builder ────────────────────────────────────────────────────

function buildEvent(cst: CstNode): EventAST {
  const children = cst.children;

  // Traverse: eventBlock > evBody > (evSource, evPayload, evHandlers)
  const evBody = children.evBody as CstNode[] | undefined;
  if (!evBody || evBody.length === 0) {
    return { kind: "Event", name: "unnamed", payload: [], handlers: [] };
  }
  const body = evBody[0];

  const name = childValue(children, "Identifier", 0) ?? "unnamed";
  const srcNode = body.children.evSource as CstNode[] | undefined;
  const source = srcNode?.[0]
    ? childValue(srcNode[0].children, "Identifier", 0)
    : undefined;

  // Payload: evSource > evPayload -> evPayloadBody -> evPayloadFields -> evPayloadField[]
  const payload: { name: string; type: string; required: boolean }[] = [];
  const payloadNode = body.children.evPayload as CstNode[] | undefined;
  if (payloadNode && payloadNode.length > 0) {
    const payloadBody = payloadNode[0].children.evPayloadBody as
      | CstNode[]
      | undefined;
    if (payloadBody && payloadBody.length > 0) {
      const payloadFields = payloadBody[0].children.evPayloadFields as
        | CstNode[]
        | undefined;
      if (payloadFields && payloadFields.length > 0) {
        const fieldNodes = payloadFields[0].children.evPayloadField ?? [];
        for (const fn of fieldNodes) {
          const field = buildPayloadField(fn as CstNode);
          if (field) payload.push(field);
        }
      }
    }
  }

  // Handlers: evHandlers -> evHandlersBody -> evHandlerList
  const handlerNames: string[] = [];
  const handlersNode = body.children.evHandlers as CstNode[] | undefined;
  if (handlersNode && handlersNode.length > 0) {
    const handlerBody = handlersNode[0].children.evHandlersBody as
      | CstNode[]
      | undefined;
    if (handlerBody && handlerBody.length > 0) {
      const handlerList = handlerBody[0].children.evHandlerList as
        | CstNode[]
        | undefined;
      if (handlerList && handlerList.length > 0) {
        const identifiers = handlerList[0].children.Identifier ?? [];
        for (const id of identifiers) {
          if (typeof id === "object" && "image" in id) {
            handlerNames.push((id as any).image as string);
          }
        }
      }
    }
  }

  return { kind: "Event", name, source, payload, handlers: handlerNames };
}

function buildPayloadField(
  cst: CstNode,
): { name: string; type: string; required: boolean } | null {
  const children = cst.children;
  const name = childValue(children, "Identifier", 0);
  if (!name) return null;

  // Type is in nested evPayloadFieldType → Identifier
  let type = "string";
  const fieldTypeNode = children.evPayloadFieldType as CstNode[] | undefined;
  if (fieldTypeNode && fieldTypeNode.length > 0) {
    type = childValue(fieldTypeNode[0].children, "Identifier", 0) ?? "string";
  }

  // Check annotations for @required
  const annotationNodes = children.evPayloadFieldAnnotations;
  let required = false;
  if (annotationNodes && annotationNodes.length > 0) {
    const annotations =
      (annotationNodes[0] as CstNode).children.evPayloadFieldAnnotation ?? [];
    for (const a of annotations) {
      const val = childValue((a as CstNode).children, "Identifier", 0);
      if (val === "required") required = true;
    }
  }

  return { name, type, required };
}

// ── Decision builder ─────────────────────────────────────────────────

function buildDecision(cst: CstNode): DecisionAST {
  const children = cst.children;
  const name = childValue(children, "Identifier", 0) ?? "unnamed";

  const cases: { condition: string; actions: ActionAST[] }[] = [];
  const defaultActions: ActionAST[] = [];
  let input: string | undefined;

  // Traverse: decisionBlock → dcBody → (dcInput, dcWhenClauses, dcElseClause)
  const dcBody = children.dcBody as CstNode[] | undefined;
  if (dcBody && dcBody.length > 0) {
    const body = dcBody[0].children;

    // Input: dcBody → dcInput → Identifier
    const dcInput = body.dcInput as CstNode[] | undefined;
    if (dcInput && dcInput.length > 0) {
      input = childValue(dcInput[0].children, "Identifier", 0);
    }

    // When clauses: dcBody → dcWhenClauses → dcWhenClause[]
    const dcWhenClauses = body.dcWhenClauses as CstNode[] | undefined;
    if (dcWhenClauses && dcWhenClauses.length > 0) {
      const whenNodes = dcWhenClauses[0].children.dcWhenClause ?? [];
      for (const node of whenNodes) {
        const c = buildWhenClause(node as CstNode);
        if (c) cases.push(c);
      }
    }

    // Else clause: dcBody → dcElseClause → dcElseBody → actionStatement[]
    const dcElseClause = body.dcElseClause as CstNode[] | undefined;
    if (dcElseClause && dcElseClause.length > 0) {
      const elseBody = dcElseClause[0].children.dcElseBody as
        | CstNode[]
        | undefined;
      if (elseBody && elseBody.length > 0) {
        const actionStmts = elseBody[0].children.actionStatement as
          | CstNode[]
          | undefined;
        if (actionStmts) {
          for (const stmt of actionStmts) {
            const a = buildActionFromStatement(stmt as CstNode);
            if (a) defaultActions.push(a);
          }
        }
      }
    }
  }

  return {
    kind: "Decision",
    name,
    input,
    cases,
    defaultActions,
  };
}

function buildWhenClause(
  cst: CstNode,
): { condition: string; actions: ActionAST[] } | null {
  const children = cst.children;
  const condition = childValue(children, "Identifier", 0) ?? "";
  const actions: ActionAST[] = [];
  const actionStmts = children.actionStatement as CstNode[] | undefined;
  if (actionStmts) {
    for (const stmt of actionStmts) {
      const a = buildActionFromStatement(stmt as CstNode);
      if (a) actions.push(a);
    }
  }
  return { condition, actions };
}

// ── Location extraction ──────────────────────────────────────────────

function extractLoc(cst: CstNode): SourceLocation | undefined {
  const firstToken = findFirstToken(cst);
  const lastToken = findLastToken(cst);
  if (!firstToken || !lastToken) return undefined;
  return {
    startLine: firstToken.startLine ?? 0,
    startCol: firstToken.startColumn ?? 0,
    endLine: lastToken.endLine ?? 0,
    endCol: lastToken.endColumn ?? 0,
  };
}

function findFirstToken(node: CstNode): IToken | undefined {
  for (const key of Object.keys(node.children)) {
    for (const el of node.children[key]) {
      if (
        el &&
        typeof el === "object" &&
        "image" in el &&
        typeof (el as any).startLine === "number"
      ) {
        return el as IToken;
      }
      if (el && typeof el === "object" && "children" in el) {
        const found = findFirstToken(el as CstNode);
        if (found) return found;
      }
    }
  }
  return undefined;
}

function findLastToken(node: CstNode): IToken | undefined {
  const keys = Object.keys(node.children);
  for (let i = keys.length - 1; i >= 0; i--) {
    const els = node.children[keys[i]];
    for (let j = els.length - 1; j >= 0; j--) {
      const el = els[j];
      if (el && typeof el === "object" && "children" in el) {
        const found = findLastToken(el as CstNode);
        if (found) return found;
      }
      if (
        el &&
        typeof el === "object" &&
        "image" in el &&
        typeof (el as any).startLine === "number"
      ) {
        return el as IToken;
      }
    }
  }
  return undefined;
}

// ── Helper ───────────────────────────────────────────────────────────

function childValue(
  children: Record<string, CstElement[]>,
  key: string,
  idx: number,
): string | undefined {
  const items = children[key];
  if (!items || items.length <= idx) return undefined;
  const item = items[idx];
  if (typeof item === "object" && "image" in item) {
    return (item as any).image as string;
  }
  return undefined;
}
