// yeoman-env.ts — typed wrapper around yeoman-environment
// yeoman-environment v6 lacks full TypeScript declarations,
// so we provide a minimal typed wrapper.

import { createEnv } from 'yeoman-environment';
import type Generator from 'yeoman-generator';

interface TypedEnvironment {
  registerStub(
    generator: new (...args: any[]) => Generator,
    namespace: string,
    resolvedPath: string,
  ): void;
  run(namespace: string, options: Record<string, unknown>): Promise<void>;
}

let _instance: TypedEnvironment | null = null;

export function getEnv(): TypedEnvironment {
  if (!_instance) {
    _instance = createEnv() as unknown as TypedEnvironment;
  }
  return _instance;
}
