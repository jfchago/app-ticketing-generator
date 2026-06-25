// parser/yaml-parser.ts — Reads a YAML file and returns the raw parsed object
// Uses js-yaml. The caller is responsible for validation.

import yaml from 'js-yaml';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { RawSpec } from '../validator/schema-validator.js';

export function parseYamlFile(yamlPath: string): RawSpec {
  const absolutePath = resolve(yamlPath);
  const content = readFileSync(absolutePath, 'utf8');
  return parseYamlString(content, absolutePath);
}

export function parseYamlString(content: string, source?: string): RawSpec {
  const parsed = yaml.load(content);
  if (parsed === null || parsed === undefined) {
    throw new Error(
      `YAML file ${source ?? '<string>'} is empty or could not be parsed`,
    );
  }
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(
      `YAML file ${source ?? '<string>'} must contain a mapping, got ${typeof parsed}`,
    );
  }
  return parsed as RawSpec;
}
