// puml/puml-generator.ts — Generates PlantUML class diagram from IR
// Outputs a valid .puml file that can be rendered by PlantUML tools.

import type { IR } from "../ir/types.js";

export function generatePumlClassDiagram(ir: IR): string {
  const lines: string[] = [];

  lines.push("@startuml");
  lines.push(`title ${ir.application.name} — Domain Model`);
  lines.push("hide methods");
  lines.push("skinparam classAttributeIconSize 0");
  lines.push("skinparam linetype ortho");
  lines.push("");

  // Enums
  for (const enumDef of ir.enums) {
    lines.push(`enum ${enumDef.namePascal} {`);
    for (const val of enumDef.values) {
      lines.push(`  ${val.name}`);
    }
    lines.push("}");
    lines.push("");
  }

  // Entities
  for (const entity of ir.entities) {
    const stereo =
      entity.stereotype === "aggregate_root"
        ? "<<aggregate_root>>"
        : `<<${entity.stereotype}>>`;

    lines.push(`class ${entity.namePascal} ${stereo} {`);

    // Table hint
    if (entity.table) {
      lines.push(`  .. ${entity.table} ..`);
    }

    // Attributes
    for (const attr of entity.attributes) {
      const visibility = "-"; // private by convention
      const annotations: string[] = [];
      if (attr.primary) annotations.push("{id}");
      if (attr.isEnum) annotations.push("<<enum>>");

      const annotationStr =
        annotations.length > 0 ? " " + annotations.join(" ") : "";
      const nullable = attr.nullable && !attr.required ? "?" : "";
      lines.push(
        `  ${visibility} ${attr.name}${nullable} : ${attr.type}${annotationStr}`,
      );
    }

    // Relationships (shown as fields referencing other entities)
    for (const rel of entity.relationships) {
      if (rel.type === "many_to_one") {
        lines.push(`  - ${rel.name} : ${rel.targetPascal} <<FK>>`);
      } else if (rel.type === "one_to_many") {
        // one_to_many is shown on the OTHER side
      }
    }

    lines.push("}");
    lines.push("");
  }

  // Relationships as arrows
  for (const entity of ir.entities) {
    for (const rel of entity.relationships) {
      if (rel.type === "many_to_one") {
        const sourceCard = rel.sourceCardinality === "1" ? "1" : '"0..*"';
        const targetCard = rel.targetCardinality === "1" ? "1" : '"0..1"';
        lines.push(
          `${entity.namePascal} ${sourceCard} --> ${targetCard} ${rel.targetPascal} : ${rel.name}`,
        );
      } else if (rel.type === "one_to_many") {
        const sourceCard = "1";
        const targetCard = '"0..*"';
        lines.push(
          `${entity.namePascal} "${sourceCard}" --> "${targetCard}" ${rel.targetPascal} : ${rel.name}`,
        );
      }
    }
  }

  lines.push("");
  lines.push("@enduml");

  return lines.join("\n");
}
