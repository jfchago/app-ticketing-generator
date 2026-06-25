import { defineStore } from "pinia";
import type { User } from "../domain/user/user.types";

import { UserService } from "../domain/user/user.service";
import { UserRepositoryImpl } from "../infrastructure/repositories/user.repository.impl";

const service = new UserService(new UserRepositoryImpl());

interface UserState {
  users: User[];
  current: User | null;
  loading: boolean;
  error: string | null;
}

export const useUserStore = defineStore("user", {
  state: (): UserState => ({
    users: [],
    current: null,
    loading: false,
    error: null,
  }),

  actions: {
    async loadUsers() {
      this.loading = true;
      this.error = null;
      try {
        this.users = await service.loadUsers();
      } catch (e) {
        this.error = e instanceof Error ? e.message : "Error loading users";
      } finally {
        this.loading = false;
      }
    },
  },
});
