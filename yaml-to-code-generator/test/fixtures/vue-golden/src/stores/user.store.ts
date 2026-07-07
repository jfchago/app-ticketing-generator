import { defineStore } from 'pinia';
import type { User } from '../domain/user/user.types';

import type { UserRole } from '../domain/user/user.types';



import { UserService } from '../domain/user/user.service';
import { UserRepositoryImpl } from '../infrastructure/repositories/user.repository.impl';

const service = new UserService(new UserRepositoryImpl());




interface UserState {
  users: User[];
  current: User | null;
  loading: boolean;
  error: string | null;

}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    users: [],
    current: null,
    loading: false,
    error: null
  }),

  actions: {

    async loadUsers() {
      this.loading = true; this.error = null;
        try { this.users = await service.loadUsers(); }
        catch (e) { this.error = e instanceof Error ? e.message : 'Error loading users'; }
        finally { this.loading = false; }
    },


    async getById(id: string) {
      this.loading = true; this.error = null;
        try { this.current = await service.getById(id); }
        catch (e) { this.error = e instanceof Error ? e.message : 'Error loading user'; }
        finally { this.loading = false; }
    },


    async create(data: Omit<User, 'id' | 'createdAt'>) {
      this.loading = true; this.error = null;
        try { const created = await service.create(data);
          this.users.push(created); return created;
        } catch (e) { this.error = e instanceof Error ? e.message : 'Error creating user'; throw e; }
        finally { this.loading = false; }
    },


    async update(userId: string, value: UserRole) {
      this.error = null;
        try { await service.update(userId, value); }
        catch (e) { this.error = e instanceof Error ? e.message : 'Error in update'; throw e; }
    },


  }
});
