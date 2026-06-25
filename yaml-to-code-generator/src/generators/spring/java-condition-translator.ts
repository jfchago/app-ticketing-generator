// java-condition-translator.ts — Translates JS-like condition expressions to Java
// Used by the Spring generator to convert YAML DSL guard/condition expressions
// into valid Java boolean expressions for generated code.

import type { EntityDef } from '../../ir/types.js';

export function toJavaCondition(condition: string, entity?: EntityDef): string {
  let r = condition;
  // 1. .length === 0 → .isEmpty() (collections, before getter conversion)
  r = r.replace(/\.length\s*===\s*0/g, '.isEmpty()');
  // 1b. .length with operators → .size() for one-to-many collections, .length() for Strings
  r = r.replace(/(\w+)\.length\s*(>|<|>=|<=|!==|!=|==)/g, (_, field, op) => {
    if (entity?.relationships?.some((rel) => rel.name === field && rel.type === 'one_to_many')) {
      return `${field}.size()${op}`;
    }
    return `${field}.length()${op}`;
  });
  // 1d. Catch-all: any remaining .length → .length() (e.g., title.trim().length > 0)
  r = r.replace(/\.length(?!\()/g, '.length()');
  // 1c. .trim() === '' → .trim().isEmpty() (string trim check)
  r = r.replace(/\.trim\(\)\s*===\s*('')/g, '.trim().isEmpty()');
  // 2. JS operators → Java operators
  r = r.replace(/===/g, '==');
  r = r.replace(/!==/g, '!=');
  // 3. Single-quoted strings → double-quoted (Java convention)
  r = r.replace(/'([^']*)'/g, '"$1"');
  // 4. entity.field → entity.getField() (Lombok getter convention)
  r = r.replace(
    /entity\.(\w+)/g,
    (_, field: string) => `entity.get${field.charAt(0).toUpperCase() + field.slice(1)}()`,
  );
  // 4b. Handle ?. and ?? (optional chaining and nullish coalescing)
  r = r.replace(/(\w+\.\w+\(\))\?\.(\w+)\s*\?\?\s*(\d+)/g, '$1 != null ? $1.$2() : $3');
  // 5. context.field → Spring StateMachine extended state access
  r = r.replace(/context\.(\w+)/g, 'context.getExtendedState().get("$1", String.class)');
  // 5b. Enum-aware comparison: entity.getField() == "VALUE" → entity.getField() == EnumType.VALUE
  if (entity) {
    r = r.replace(/entity\.get(\w+)\(\)\s*==\s*"([^"]*)"/g, (_, field: string, val: string) => {
      const attrName = field.charAt(0).toLowerCase() + field.slice(1);
      const attr = entity.attributes.find((a) => a.name === attrName && a.isEnum);
      if (attr) {
        return `entity.get${field}() == ${attr.type}.${val}`;
      }
      return `entity.get${field}() == "${val}"`;
    });
  }
  // 5c. Enum-aware != comparison: != "VALUE" → != EnumType.VALUE
  if (entity) {
    r = r.replace(/entity\.get(\w+)\(\)\s*!=\s*"([^"]*)"/g, (_, field: string, val: string) => {
      const attrName = field.charAt(0).toLowerCase() + field.slice(1);
      const attr = entity.attributes.find((a) => a.name === attrName && a.isEnum);
      if (attr) {
        return `entity.get${field}() != ${attr.type}.${val}`;
      }
      return `entity.get${field}() != "${val}"`;
    });
    r = r.replace(/(\w+)\s*!=\s*"([^"]*)"/g, (_, field: string, val: string) => {
      const attr = entity.attributes.find((a) => a.name === field && a.isEnum);
      if (attr) {
        return `${field} != ${attr.type}.${val}`;
      }
      return `${field} != "${val}"`;
    });
  }
  // 6. Replace == "string" with .equals("string") for Java string comparison
  r = r.replace(/\s*==\s*"([^"]*)"/g, '.equals("$1")');
  // 6b. Replace remaining != "string" with !.equals("string") for Java string comparison
  r = r.replace(/(\w+)\s*!=\s*"([^"]*)"/g, '!$1.equals("$2")');
  return r;
}
