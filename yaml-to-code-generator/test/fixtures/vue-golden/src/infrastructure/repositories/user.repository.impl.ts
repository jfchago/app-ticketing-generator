import type { User } from '../../domain/user/user.types';
import type { UserRole } from '../../domain/user/user.types';

import type { UserRepository } from '../../domain/user/user.repository';
import { apiClient } from '../api-client';

export class UserRepositoryImpl implements UserRepository {
  async loadUsers(): Promise<User[]> {
    const { data: responseData } = await apiClient.get<User[]>('/users');
    return responseData;
  }

  async getById(id: string): Promise<User> {
    const { data: responseData } = await apiClient.get<User>(`/users/${id}`);
    return responseData;
  }

  async create(data: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const { data: responseData } = await apiClient.post<User>('/users', data);
    return responseData;
  }

  async update(userId: string, value: UserRole): Promise<User> {
    const { data: responseData } = await apiClient.put<User>(`/users/${userId}`, { value });
    return responseData;
  }
}
