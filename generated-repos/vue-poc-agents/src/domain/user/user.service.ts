import type { User } from './user.types';

import type { UserRepository } from './user.repository';

export interface UserServiceHooks {
  beforeLoadUsers?(): Promise<void> | void;

  afterLoadUsers?(result: User[]): Promise<void> | void;

  beforeGetById?(id: string): Promise<void> | void;

  afterGetById?(result: User): Promise<void> | void;
}

export class UserService {
  repository: UserRepository;
  private readonly hooks?: Partial<UserServiceHooks>;

  constructor(repository: UserRepository, hooks?: Partial<UserServiceHooks>) {
    this.repository = repository;
    this.hooks = hooks;
  }

  async loadUsers(): Promise<User[]> {
    try {
      await this.hooks?.beforeLoadUsers?.();
    } catch {}
    const result = await this.repository.loadUsers();
    try {
      await this.hooks?.afterLoadUsers?.(result);
    } catch {}
    return result;
  }

  async getById(id: string): Promise<User> {
    try {
      await this.hooks?.beforeGetById?.(id);
    } catch {}

    const result = await this.repository.getById(id);
    try {
      await this.hooks?.afterGetById?.(result);
    } catch {}
    return result;
  }
}
