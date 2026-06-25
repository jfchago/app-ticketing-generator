import { describe, it, expect } from "vitest";
import { canonicalize } from "../canonicalize.js";
import { versionToString } from "../resolver.js";

describe("Versioning integration", () => {
  const validSpec: Record<string, unknown> = {
    version: "1.0.0",
    application: { name: "Mini HelpDesk", module: "helpdesk" },
    entities: [
      {
        name: "Ticket",
        attributes: [
          { name: "id", type: "String", primary: true },
          { name: "title", type: "String" },
        ],
      },
    ],
    enums: {
      TicketStatus: { values: ["OPEN", "CLOSED"] },
    },
  };

  it("round-trips version through canonicalize", () => {
    const result = canonicalize(validSpec);
    expect(versionToString(result.originalVersion)).toBe("1.0.0");
    expect(versionToString(result.canonicalVersion)).toBe("1.0.0");
    expect(result.migrated).toBe(false);
    expect(result.migrationPath).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("handles spec with v prefix version", () => {
    const spec = { ...validSpec, version: "v1.0.0" };
    const result = canonicalize(spec);
    expect(result.originalVersion).toEqual({ major: 1, minor: 0, patch: 0 });
  });

  it("handles spec with numeric version", () => {
    const spec = { ...validSpec, version: 3 };
    const result = canonicalize(spec);
    expect(result.originalVersion).toEqual({ major: 3, minor: 0, patch: 0 });
  });

  it("normalized spec passes structural validation shape", () => {
    const result = canonicalize(validSpec);
    const spec = result.spec as Record<string, unknown>;
    expect(spec["version"]).toBeDefined();
    expect(spec["application"]).toBeDefined();
    expect(Array.isArray(spec["entities"])).toBe(true);
    expect(spec["entities"]).toHaveLength(1);
    expect(typeof spec["enums"]).toBe("object");
  });

  it("canonical result is idempotent", () => {
    const first = canonicalize(validSpec);
    const second = canonicalize(first.spec as Record<string, unknown>);
    expect(versionToString(second.originalVersion)).toBe(
      versionToString(first.canonicalVersion),
    );
    expect(second.migrated).toBe(false);
    expect(second.spec).toEqual(first.spec);
  });

  it("snapshot: canonicalized structure is stable", () => {
    const result = canonicalize(validSpec);
    expect(result.spec).toMatchSnapshot();
  });

  it("snapshot: version info matches spec", () => {
    const result = canonicalize(validSpec);
    expect({
      originalVersion: result.originalVersion,
      canonicalVersion: result.canonicalVersion,
      migrated: result.migrated,
    }).toMatchSnapshot();
  });
});
