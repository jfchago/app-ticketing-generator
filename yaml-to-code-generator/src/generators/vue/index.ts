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
    this.renderEjs('shared/tokens.css.ejs', 'src/styles/tokens.css', genCtx);
    this.renderEjs('shared/base.css.ejs', 'src/styles/base.css', genCtx);
    this.renderEjs('shared/utilities.css.ejs', 'src/styles/utilities.css', genCtx);
    this.renderEjs('shared/date-utils.ts.ejs', 'src/shared/date-utils.ts', genCtx);
    this.renderEjs('shared/App.vue.ejs', 'src/App.vue', genCtx);

    this.renderEjs('components/LoaderSpinner.vue.ejs', 'src/components/LoaderSpinner.vue', genCtx);
    this.renderEjs('components/ErrorState.vue.ejs', 'src/components/ErrorState.vue', genCtx);
    this.renderEjs('components/EmptyState.vue.ejs', 'src/components/EmptyState.vue', genCtx);
    this.renderEjs('components/AppShell.vue.ejs', 'src/components/AppShell.vue', genCtx);
    this.renderEjs('components/NavBar.vue.ejs', 'src/components/NavBar.vue', genCtx);
    this.renderEjs('components/Breadcrumbs.vue.ejs', 'src/components/Breadcrumbs.vue', genCtx);
    this.renderEjs('components/Badge.vue.ejs', 'src/components/Badge.vue', genCtx);
    this.renderEjs('components/Heading.vue.ejs', 'src/components/Heading.vue', genCtx);
    this.renderEjs('components/FormField.vue.ejs', 'src/components/FormField.vue', genCtx);

    for (const entity of ir.entities) {
      this.#renderEntity(entity, genCtx);
    }
  }

  install(): void {
    this.log('   ℹ Run `npm install` in the output directory to install dependencies.');
  }

  #renderEntity(entity: EntityDef, genCtx: Record<string, unknown>): void {
    const ctx = { entity, ...genCtx };
    const genEntity = (genCtx.genEntities as Record<string, any>)?.[entity.name];

    this.renderEjs(
      'domain/entity.types.ts.ejs',
      `src/domain/${entity.nameCamel}/${entity.nameCamel}.types.ts`,
      ctx,
    );
    this.renderEjs(
      'domain/entity.repository.ts.ejs',
      `src/domain/${entity.nameCamel}/${entity.nameCamel}.repository.ts`,
      ctx,
    );
    this.renderEjs(
      'domain/entity.service.ts.ejs',
      `src/domain/${entity.nameCamel}/${entity.nameCamel}.service.ts`,
      ctx,
    );

    this.renderEjs(
      'infrastructure/entity.repository.impl.ts.ejs',
      `src/infrastructure/repositories/${entity.nameCamel}.repository.impl.ts`,
      ctx,
    );

    this.renderEjs('stores/entity.store.ts.ejs', `src/stores/${entity.nameCamel}.store.ts`, ctx);

    if (!entity.nameCamel.startsWith('comment')) {
      this.renderEjs(
        'components/EntityCard.vue.ejs',
        `src/components/${entity.namePascal}Card.vue`,
        ctx,
      );
      if (genEntity?.hasCreate || genEntity?.hasUpdate) {
        this.renderEjs(
          'components/EntityForm.vue.ejs',
          `src/components/${entity.namePascal}Form.vue`,
          ctx,
        );
      }
    }

    if (genEntity?.hasGetAll) {
      this.renderEjs(
        'views/EntityListView.vue.ejs',
        `src/views/${entity.namePascal}ListView.vue`,
        ctx,
      );
    }
    if (genEntity?.hasGetById) {
      this.renderEjs(
        'views/EntityDetailView.vue.ejs',
        `src/views/${entity.namePascal}DetailView.vue`,
        ctx,
      );
    }
    if (genEntity?.hasCreate) {
      this.renderEjs(
        'views/CreateEntityView.vue.ejs',
        `src/views/Create${entity.namePascal}View.vue`,
        ctx,
      );
    }
  }
}
