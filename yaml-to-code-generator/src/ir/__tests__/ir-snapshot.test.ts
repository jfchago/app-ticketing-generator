import { describe, it, expect } from "vitest";
import { parseYamlFile } from "../../parser/yaml-parser.js";
import { validateSpec } from "../../validator/schema-validator.js";
import { buildIR as buildIRModel } from "../../ir/builder.js";
import { buildSemanticModelOrThrow } from "../../semantic/index.js";
import { toIRSnapshot, compareIRSnapshots } from "../snapshot.js";
import type { IRSnapshot } from "../snapshot.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const _testDir = path.dirname(fileURLToPath(import.meta.url));
const SPEC_PATH = path.resolve(_testDir, "../../..", "specs/helpdesk.yaml");
const GOLDEN_PATH = path.resolve(
  _testDir,
  "../../..",
  "test/fixtures/ir-golden-master.json",
);

function buildIRForTest() {
  const raw = parseYamlFile(SPEC_PATH);
  const spec = validateSpec(raw);
  const semantic = buildSemanticModelOrThrow(spec);
  return buildIRModel(semantic);
}

function buildSnapshot(ir: ReturnType<typeof buildIRForTest>): IRSnapshot {
  return toIRSnapshot(ir, "specs/helpdesk.yaml", "test-fixture");
}

function readGoldenMaster(): IRSnapshot | null {
  if (!fs.existsSync(GOLDEN_PATH)) return null;
  return JSON.parse(fs.readFileSync(GOLDEN_PATH, "utf-8")) as IRSnapshot;
}

function writeGoldenMaster(snapshot: IRSnapshot): void {
  const dir = path.dirname(GOLDEN_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(GOLDEN_PATH, JSON.stringify(snapshot, null, 2), "utf-8");
}

describe("IR Snapshot", () => {
  const ir = buildIRForTest();
  const snapshot = buildSnapshot(ir);

  it("has correct summary counts", () => {
    expect(snapshot.summary.entities).toBe(3);
    expect(snapshot.summary.enums).toBe(2);
    expect(snapshot.summary.attributes).toBe(17);
    expect(snapshot.summary.relationships).toBe(4);
    expect(snapshot.summary.useCases).toBe(10);
    expect(snapshot.summary.flags.hasStateMachine).toBe(true);
    expect(snapshot.summary.flags.hasRules).toBe(true);
    expect(snapshot.summary.flags.hasValidation).toBe(true);
  });

  it("has correct entity names", () => {
    expect(snapshot.entities.map((e) => e.name).sort()).toEqual([
      "Comment",
      "Ticket",
      "User",
    ]);
  });

  it("Ticket entity has correct snapshot properties", () => {
    const ticket = snapshot.entities.find((e) => e.name === "Ticket")!;
    expect(ticket.attributeCount).toBe(8);
    expect(ticket.relationshipCount).toBe(2);
    expect(ticket.useCaseCount).toBe(8);
    expect(ticket.useCaseNames.sort()).toEqual([
      "add_comment",
      "assign_user",
      "create",
      "get_all",
      "get_by_id",
      "unassign_user",
      "update_priority",
      "update_status",
    ]);
    expect(ticket.flags.hasCreate).toBe(true);
    expect(ticket.flags.hasUpdate).toBe(true);
    expect(ticket.flags.hasGetAll).toBe(true);
    expect(ticket.flags.hasGetById).toBe(true);
    expect(ticket.pkType).toBe("String");
    expect(ticket.transitionKeys).toHaveLength(4);
  });

  it("Comment entity has correct attributes", () => {
    const comment = snapshot.entities.find((e) => e.name === "Comment")!;
    expect(comment.attributeCount).toBe(5);
    expect(comment.relationshipCount).toBe(2); // ticket→Ticket + author→User
    expect(comment.useCaseCount).toBe(1);
    expect(comment.useCaseNames).toEqual(["add_comment"]);
    expect(comment.flags.hasCreate).toBe(false);
    expect(comment.flags.hasGetAll).toBe(false);
    expect(comment.flags.hasGetById).toBe(false);
  });

  it("User entity has correct attributes", () => {
    const user = snapshot.entities.find((e) => e.name === "User")!;
    expect(user.attributeCount).toBe(4);
    expect(user.relationshipCount).toBe(0);
    expect(user.useCaseCount).toBe(1);
    expect(user.useCaseNames).toEqual(["load_users"]);
    expect(user.flags.hasGetAll).toBe(true); // load_users counts as hasGetAll
    expect(user.flags.hasCreate).toBe(false);
  });

  it("has correct enums", () => {
    expect(snapshot.enums.map((e) => e.name).sort()).toEqual([
      "TicketPriority",
      "TicketStatus",
    ]);
    const status = snapshot.enums.find((e) => e.name === "TicketStatus")!;
    expect(status.values.map((v) => v.name)).toEqual([
      "OPEN",
      "IN_PROGRESS",
      "RESOLVED",
      "CLOSED",
    ]);
    const priority = snapshot.enums.find((e) => e.name === "TicketPriority")!;
    expect(priority.values.map((v) => v.name)).toEqual([
      "LOW",
      "MEDIUM",
      "HIGH",
      "URGENT",
    ]);
  });

  it("IR snapshot has all required metadata", () => {
    expect(snapshot.meta.tool).toBe("yaml2code-ir");
    expect(snapshot.meta.version).toBe(1);
    expect(snapshot.meta.specPath).toBe("specs/helpdesk.yaml");
    expect(snapshot.meta.timestamp).toBeTruthy();
  });

  it("snapshot matches golden master", () => {
    const golden = readGoldenMaster();
    if (!golden) {
      writeGoldenMaster(snapshot);
      return;
    }
    const { match, diffs } = compareIRSnapshots(golden, snapshot);
    if (!match) {
      console.error("IR Golden Master differences:", diffs.join("\n  "));
    }
    expect(diffs).toEqual([]);
    expect(match).toBe(true);
  });

  it("snapshot is fully serializable", () => {
    const str = JSON.stringify(snapshot);
    expect(str).toBeTruthy();
    const parsed = JSON.parse(str) as IRSnapshot;
    expect(parsed.summary.entities).toBe(3);
    expect(parsed.meta.tool).toBe("yaml2code-ir");
  });

  it("IR entities reference is consistent", () => {
    const entities = ir.entities;
    expect(entities.length).toBe(3);
    const ticket = entities.find((e) => e.name === "Ticket")!;
    expect(ticket.namePascal).toBe("Ticket");
    expect(ticket.nameCamel).toBe("ticket");
    expect(ticket.nameKebab).toBe("ticket");
    expect(ticket.table).toBe("tickets");
    expect(ticket.stereotype).toBe("aggregate_root");
    expect(ir.buildFeatures).toBeDefined();
  });

  it("IR use cases have categories", () => {
    const ticket = ir.entities.find((e) => e.name === "Ticket")!;
    for (const uc of ticket.useCases) {
      if (
        uc.name === "get_all" ||
        uc.name === "get_by_id" ||
        uc.name === "load_users"
      ) {
        expect(uc.category).toBe("read");
      } else if (uc.name === "create") {
        expect(uc.category).toBe("create");
      } else if (uc.name === "update_status" || uc.name === "update_priority") {
        expect(uc.category).toBe("update");
      }
    }
  });

  it("IR attributes resolve types correctly", () => {
    const ticket = ir.entities.find((e) => e.name === "Ticket")!;
    const idAttr = ticket.attributes.find((a) => a.name === "id")!;
    expect(idAttr.type).toBe("String");
    expect(idAttr.primary).toBe(true);
    const statusAttr = ticket.attributes.find((a) => a.name === "status")!;
    expect(statusAttr.type).toBe("TicketStatus");
    expect(statusAttr.isEnum).toBe(true);
  });
});
