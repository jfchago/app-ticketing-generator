// generation/common.ts — Shared types for all Generation Models
// Every target model extends or references these base contracts.

import type { IR } from "../ir/types.js";

export interface GenerationModel {
  ir: IR;
  entities: { [name: string]: GeneratedEntity };
  enums: GeneratedEnum[];
  features: IR["buildFeatures"];
}

export interface GeneratedEntity {
  name: string;
  namePascal: string;
  nameCamel: string;
  nameKebab: string;
  stereotype: string;
  hasCreate: boolean;
  hasUpdate: boolean;
  hasDelete: boolean;
  hasGetAll: boolean;
  hasGetById: boolean;
}

export interface GeneratedEnum {
  name: string;
  namePascal: string;
  nameCamel: string;
  values: { name: string; label: string }[];
}
