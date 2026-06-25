import type { User } from "../../domain/user/user.types";

import type { UserRepository } from "../../domain/user/user.repository";
import { apiClient } from "../api-client";

export class UserRepositoryImpl implements UserRepository {
  async loadUsers(): Promise<User[]> {
    const { data } = await apiClient.get<User[]>("/users");
    return data;
  }
}
