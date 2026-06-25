import { VueGenerator } from '../../generators/vue/index.js';
import { buildVueGenerationModel } from '../../generation/vue/builder.js';
import { DEFAULT_REGISTRY } from '../registry.js';
import type { TargetAdapter, GenerationOpts } from '../types.js';
import type { IR } from '../../ir/types.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const _vueDir = dirname(fileURLToPath(import.meta.url));

const VUE_PATH = resolve(_vueDir, '../../generators/vue/index.ts');

export const VUE_ADAPTER: TargetAdapter = {
  name: 'vue',
  displayName: 'Vue 3 + TypeScript',
  generatorModulePath: VUE_PATH,
  generatorNamespace: 'yaml2code:vue',

  buildRunOptions(ir: IR, baseOpts: GenerationOpts): Record<string, unknown> {
    const vueGen = buildVueGenerationModel(ir);
    return {
      ...baseOpts,
      vueGen,
      genEntities: vueGen.entities,
    };
  },
};

export { VueGenerator };

DEFAULT_REGISTRY.register(VUE_ADAPTER);
