// puml/puml-parser.ts — Extracts entities from PlantUML class diagrams
// Input: .puml file content (string)
// Output: YAML-compatible domain spec (entities, enums, attributes)

import type {
  RawSpec,
  ValidatedEntity,
  ValidatedAttribute,
  ValidatedRelationship,
} from "../validator/schema-validator.js";

interface PumlEntity {
  name: string;
  stereotype: string;
  table: string;
  attributes: PumlAttribute[];
}

interface PumlAttribute {
  name: string;
  type: string;
  visibility: string;
  isId: boolean;
  isEnum: boolean;
}

export function parsePumlClassDiagram(content: string): RawSpec {
  const entities = extractEntities(content);
  const enums = extractEnums(content);

  return buildSpec(entities, enums);
}

function extractEntities(content: string): PumlEntity[] {
  const entities: PumlEntity[] = [];
  const lines = content.split("\n");

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    // Match: class ClassName <<stereotype>> {
    const classMatch = line.match(
      /^class\s+(\w+)\s*(?:<<(\w+)>>)?\s*(?:<<(\w+)>>)?\s*\{?/,
    );
    if (!classMatch) {
      i++;
      continue;
    }

    const name = classMatch[1];
    // stereotype can be in multiple <<>> or single
    const stereotypes =
      line.match(/<<(\w+)>>/g)?.map((s) => s.replace(/[<>]/g, "")) ?? [];
    const stereotype = stereotypes[0] ?? "entity";

    let table = "";
    const tableLine = line.match(/\.\.\s*(\w+)\s*\.\./);
    if (tableLine) {
      table = tableLine[1];
    }

    const attributes: PumlAttribute[] = [];
    let j = line.includes("{") && !line.includes("}") ? i + 1 : i;
    let openBraces = line.includes("{") ? 1 : 0;

    if (line.includes("{") && line.includes("}")) {
      // Single-line class body
      i++;
      continue;
    }

    if (!line.includes("{") || openBraces === 0) {
      i++;
      continue;
    }

    // Scan forward for the class body
    while (j < lines.length && openBraces > 0) {
      const bodyLine = lines[j].trim();

      if (bodyLine.includes("{")) openBraces++;
      if (bodyLine.includes("}")) {
        openBraces--;
        if (openBraces === 0) break;
      }

      // Detect table hint: .. table_name ..
      const tableHint = bodyLine.match(/\.\.\s*(\w+)\s*\.\./);
      if (tableHint && !table) {
        table = tableHint[1];
        j++;
        continue;
      }

      // Match attribute: -/+ name : Type {id} <<enum>>
      const attrMatch = bodyLine.match(
        /^([-+#~])\s+(\w+)\s*:\s*(\w+)(?:\s*\{(\w+)\})?(?:\s*<<(\w+)>>)?/,
      );
      if (attrMatch) {
        const visibility = mapVisibility(attrMatch[1]);
        const attrName = attrMatch[2];
        const attrType = attrMatch[3];
        const isId = attrMatch[4] === "id";
        const isEnum = attrMatch[5] === "enum";

        attributes.push({
          name: attrName,
          type: attrType,
          visibility,
          isId,
          isEnum,
        });
      }

      j++;
    }

    if (name) {
      entities.push({
        name,
        stereotype,
        table: table || name.toLowerCase(),
        attributes,
      });
    }

    i = j + 1;
  }

  return entities;
}

function extractEnums(content: string): Record<string, { values: string[] }> {
  const enums: Record<string, { values: string[] }> = {};

  // Look for <<enum>> stereotypes in class declarations or standalone enum blocks
  const lines = content.split("\n");
  let currentEnum: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // enum EnumName
    const enumDecl = line.match(/^enum\s+(\w+)/);
    if (enumDecl) {
      currentEnum = enumDecl[1];
      enums[currentEnum] = { values: [] };
      continue;
    }

    if (currentEnum && line.includes("}")) {
      currentEnum = null;
      continue;
    }

    if (currentEnum) {
      const value = line.trim().replace(/[\s{},]/g, "");
      if (value.match(/^\w+$/)) {
        enums[currentEnum].values.push(value);
      }
    }
  }

  // If no explicit enums found, infer from <<enum>> attribute annotations
  if (Object.keys(enums).length === 0) {
    const inferredEnums = new Set<string>();
    for (const line of lines) {
      const enumAttr = line.match(/\w+\s*:\s*(\w+)\s*<<enum>>/);
      if (enumAttr) {
        inferredEnums.add(enumAttr[1]);
      }
    }
    for (const enumName of inferredEnums) {
      enums[enumName] = { values: [] };
    }
  }

  return enums;
}

function mapVisibility(char: string): string {
  switch (char) {
    case "-":
      return "private";
    case "+":
      return "public";
    case "#":
      return "protected";
    case "~":
      return "package";
    default:
      return "private";
  }
}

function buildSpec(
  entities: PumlEntity[],
  enums: Record<string, { values: string[] }>,
): RawSpec {
  const entityDefs: ValidatedEntity[] = entities.map((e) => ({
    name: e.name,
    table: e.table,
    description: `Entity extracted from PlantUML diagram`,
    stereotype: e.stereotype as "entity" | "aggregate_root" | "value_object",
    attributes: e.attributes.map(
      (a): ValidatedAttribute => ({
        name: a.name,
        type: a.type,
        required: !a.isId, // IDs are not required on input
        primary: a.isId,
        column: a.name,
        length: a.type === "String" ? 255 : undefined,
        unique: false,
      }),
    ),
    relationships: [] as ValidatedRelationship[],
    rules: [],
    use_cases: [] as string[],
  }));

  return {
    application: {
      name: "Extracted from PUML",
      module: "extracted",
      description: "Domain model extracted from PlantUML class diagram",
    },
    enums,
    entities: entityDefs,
  };
}
