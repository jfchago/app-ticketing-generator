import type { TargetAdapter, TargetRegistration } from "./types.js";

export class TargetRegistry {
  private _targets = new Map<string, TargetAdapter>();
  private _registrations: TargetRegistration[] = [];

  register(adapter: TargetAdapter): void {
    if (this._targets.has(adapter.name)) {
      throw new Error(`Target "${adapter.name}" is already registered.`);
    }
    this._targets.set(adapter.name, adapter);
    this._registrations.push({
      name: adapter.name,
      displayName: adapter.displayName,
      adapter,
      registeredAt: new Date().toISOString(),
    });
  }

  get(name: string): TargetAdapter | undefined {
    return this._targets.get(name);
  }

  list(): TargetRegistration[] {
    return [...this._registrations];
  }

  listNames(): string[] {
    return [...this._targets.keys()];
  }

  get count(): number {
    return this._targets.size;
  }

  has(name: string): boolean {
    return this._targets.has(name);
  }

  reset(): void {
    this._targets.clear();
    this._registrations = [];
  }
}

export const DEFAULT_REGISTRY = new TargetRegistry();
