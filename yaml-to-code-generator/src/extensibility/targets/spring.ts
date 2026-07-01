import { SpringGenerator } from '../../generators/spring/index.js';
import { buildSpringGenerationModel } from '../../generation/spring/builder.js';
import { DEFAULT_REGISTRY } from '../registry.js';
import type { TargetAdapter, GenerationOpts } from '../types.js';
import type { IR } from '../../ir/types.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const _dir = dirname(fileURLToPath(import.meta.url));

const SPRING_PATH = resolve(_dir, '../../generators/spring/index.ts');

export const SPRING_ADAPTER: TargetAdapter = {
  name: 'spring',
  displayName: 'Spring Boot 3',
  generatorModulePath: SPRING_PATH,
  generatorNamespace: 'yaml2code:spring',
  generatorClass: SpringGenerator,

  buildRunOptions(ir: IR, baseOpts: GenerationOpts): Record<string, unknown> {
    const springGen = buildSpringGenerationModel(ir);
    return {
      ...baseOpts,
      springGen,
      genEntities: springGen.entities,
    };
  },
};

export { SpringGenerator };

DEFAULT_REGISTRY.register(SPRING_ADAPTER);
