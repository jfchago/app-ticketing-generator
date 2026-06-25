// generators/spring/index.ts — Spring Boot 3 Yeoman generator
// Target: generates JPA entities, repos, services, controllers, and config

import { BaseGenerator } from '../base/index.js';
import type { EntityDef, BuildTool } from '../../ir/types.js';
import type { SpringGenerationModel } from '../../generation/spring/types.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { toJavaCondition } from './java-condition-translator.js';

const _springTemplates = dirname(fileURLToPath(import.meta.url)) + '/templates';

export interface SpringGeneratorOptions {
  buildTool?: BuildTool;
}

export class SpringGenerator extends BaseGenerator {
  protected determineSourceRoot(): string {
    return _springTemplates;
  }
  private buildTool: BuildTool;
  private springGen?: SpringGenerationModel;

  constructor(args: string[], opts: any) {
    super(args, opts);
    this.buildTool = opts.buildTool ?? 'gradle';
    this.springGen = opts.springGen as SpringGenerationModel;
    Object.assign(this.globalContext, { toJavaCondition });
  }

  writing(): void {
    const ir = this.ir;
    const basePackage = ir.application.basePackage;
    const pkgPath = basePackage.replace(/\./g, '/');

    const genCtx: Record<string, unknown> = {};
    if (this.springGen) {
      genCtx.springGen = this.springGen;
      genCtx.genEntities = this.springGen.entities;
    }

    // ── Build files ──
    if (this.buildTool === 'maven') {
      this.renderEjs('pom.xml.ejs', 'pom.xml', genCtx);
    } else {
      this.renderEjs('build.gradle.ejs', 'build.gradle', genCtx);
      this.renderEjs('settings.gradle.ejs', 'settings.gradle', genCtx);
    }

    // ── Config ──
    this.renderEjs('config/application.properties.ejs', 'src/main/resources/application.properties', genCtx);
    this.renderEjs('config/CorsConfig.java.ejs', `src/main/java/${pkgPath}/config/CorsConfig.java`, genCtx);
    this.renderEjs('config/Application.java.ejs', `src/main/java/${pkgPath}/${ir.application.appClassName}Application.java`, genCtx);
    this.renderEjs('config/DataInitializer.java.ejs', `src/main/java/${pkgPath}/config/DataInitializer.java`, genCtx);

    // ── Enums ──
    for (const enumDef of ir.enums) {
      this.renderEjs('enum/Enum.java.ejs', `src/main/java/${pkgPath}/entity/${enumDef.namePascal}.java`, { enumDef, ...genCtx });
    }

    // ── DTOs ──
    for (const entity of ir.entities) {
      this.renderEjs('dto/EntityDTO.java.ejs', `src/main/java/${pkgPath}/dto/${entity.namePascal}DTO.java`, { entity, ...genCtx });
    }

    // ── Mappers ──
    for (const entity of ir.entities) {
      this.renderEjs('dto/EntityMapper.java.ejs', `src/main/java/${pkgPath}/dto/${entity.namePascal}Mapper.java`, { entity, ...genCtx });
    }

    // ── Per-entity templates ──
    for (const entity of ir.entities) {
      this.#renderEntity(entity, pkgPath, genCtx);
    }

    // ── Event publishers/listeners ──
    if (ir.events?.length || ir.entities.some(e => e.entityEvents?.length)) {
      for (const ev of ir.events ?? []) {
        this.renderEjs(
          'event/Event.java.ejs',
          `src/main/java/${pkgPath}/event/${ev.name}Event.java`,
          { event: ev, ...genCtx },
        );
        this.renderEjs(
          'event/EventPublisher.java.ejs',
          `src/main/java/${pkgPath}/event/${ev.name}EventPublisher.java`,
          { event: ev, ...genCtx },
        );
      }
      this.renderEjs(
        'event/EventListener.java.ejs',
        `src/main/java/${pkgPath}/event/${ir.application.appClassName}EventListener.java`,
        genCtx,
      );
    }

  }

  install(): void {
    const cmd = this.buildTool === 'maven' ? 'mvn compile' : './gradlew build';
    this.log(`   ℹ Run \`${cmd}\` in the output directory to compile.`);
  }

  #renderEntity(entity: EntityDef, pkgPath: string, genCtx: Record<string, unknown>): void {
    const ctx = { entity, ...genCtx };

    this.renderEjs('entity/Entity.java.ejs', `src/main/java/${pkgPath}/entity/${entity.namePascal}.java`, ctx);
    this.renderEjs('repository/EntityRepository.java.ejs', `src/main/java/${pkgPath}/repository/${entity.namePascal}Repository.java`, ctx);
    this.renderEjs('service/EntityService.java.ejs', `src/main/java/${pkgPath}/service/${entity.namePascal}Service.java`, ctx);
    this.renderEjs('controller/EntityController.java.ejs', `src/main/java/${pkgPath}/controller/${entity.namePascal}Controller.java`, ctx);
  }
}
