import type { User } from './user.types';

import type { UserRepository } from './user.repository';

export class UserService {
  repository: UserRepository;

  constructor(repository: UserRepository) {
    this.repository = repository;
  }

  async loadUsers(): Promise<User[]> {
    return this.repository.loadUsers();
  }
}
