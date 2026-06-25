import { BaseGenerator } from '../base/index.js';
import type { EntityDef } from '../../ir/types.js';
import type { VueGenerationModel } from '../../generation/vue/types.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const _vueTemplates = dirname(fileURLToPath(import.meta.url)) + '/templates';

export class VueGenerator extends BaseGenerator {
  private vueGen?: VueGenerationModel;

  constructor(args: string[], opts: any) {
    super(args, opts);
    this.vueGen = opts.vueGen as VueGenerationModel;
  }

  protected determineSourceRoot(): string {
    return _vueTemplates;
  }
  writing(): void {
    const ir = this.ir;

    const genCtx: Record<string, unknown> = {};
    if (this.vueGen) {
      genCtx.vueGen = this.vueGen;
      genCtx.genEntities = this.vueGen.entities;
    }

    this.renderEjs('shared/enums.ts.ejs', 'src/domain/enums.ts', genCtx);
    this.renderEjs('shared/api-client.ts.ejs', 'src/infrastructure/api-client.ts', genCtx);
    this.renderEjs('shared/router.ts.ejs', 'src/app/router/index.ts', genCtx);

    for (const entity of ir.entities) {
      this.#renderEntity(entity, genCtx);
    }
  }

  install(): void {
    this.log('   ℹ Run `npm install` in the output directory to install dependencies.');
  }

  #renderEntity(entity: EntityDef, genCtx: Record<string, unknown>): void {
    const ctx = { entity, ...genCtx };

    this.renderEjs('domain/entity.types.ts.ejs', `src/domain/${entity.nameCamel}/${entity.nameCamel}.types.ts`, ctx);
    this.renderEjs('domain/entity.repository.ts.ejs', `src/domain/${entity.nameCamel}/${entity.nameCamel}.repository.ts`, ctx);
    this.renderEjs('domain/entity.service.ts.ejs', `src/domain/${entity.nameCamel}/${entity.nameCamel}.service.ts`, ctx);

    this.renderEjs('infrastructure/entity.repository.impl.ts.ejs', `src/infrastructure/repositories/${entity.nameCamel}.repository.impl.ts`, ctx);

    this.renderEjs('stores/entity.store.ts.ejs', `src/stores/${entity.nameCamel}.store.ts`, ctx);

    if (!entity.nameCamel.startsWith('comment')) {
      this.renderEjs('components/EntityCard.vue.ejs', `src/components/${entity.namePascal}Card.vue`, ctx);
      if (entity.hasCreate || entity.hasUpdate) {
        this.renderEjs('components/EntityForm.vue.ejs', `src/components/${entity.namePascal}Form.vue`, ctx);
      }
    }

    if (entity.attributes.some(a => a.name === 'status' && a.isEnum)) {
      this.renderEjs('components/StatusBadge.vue.ejs', `src/components/${entity.namePascal}StatusBadge.vue`, ctx);
    }
    if (entity.attributes.some(a => a.name === 'priority' && a.isEnum)) {
      this.renderEjs('components/PriorityBadge.vue.ejs', `src/components/${entity.namePascal}PriorityBadge.vue`, ctx);
    }
    if (entity.relationships.some(r => r.name === 'assignee')) {
      this.renderEjs('components/AssigneeBadge.vue.ejs', `src/components/${entity.namePascal}AssigneeBadge.vue`, ctx);
    }

    if (entity.hasGetAll) {
      this.renderEjs('views/EntityListView.vue.ejs', `src/views/${entity.namePascal}ListView.vue`, ctx);
    }
    if (entity.hasGetById) {
      this.renderEjs('views/EntityDetailView.vue.ejs', `src/views/${entity.namePascal}DetailView.vue`, ctx);
    }
    if (entity.hasCreate) {
      this.renderEjs('views/CreateEntityView.vue.ejs', `src/views/Create${entity.namePascal}View.vue`, ctx);
    }


  }
}
