// user.repository.ts — Generated from helpdesk.yaml
import type { User } from "./user.types";

export interface UserRepository {
  loadUsers(): Promise<User[]>;
}
