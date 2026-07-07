// user.repository.ts — Generated from helpdesk.yaml
import type { User } from './user.types';
import type { UserRole } from './user.types';

export interface UserRepository {
  loadUsers(): Promise<User[]>;
  getById(id: string): Promise<User>;
  create(data: Omit<User, 'id' | 'createdAt'>): Promise<User>;
  update(userId: string, value: UserRole): Promise<User>;
}
