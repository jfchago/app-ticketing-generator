import type { Ticket } from '../../domain/ticket/ticket.types';
import type { TicketStatus, TicketPriority } from '../../domain/ticket/ticket.types';

import type { Comment } from '../../domain/comment/comment.types';

import type { TicketRepository } from '../../domain/ticket/ticket.repository';
import { apiClient } from '../api-client';

export class TicketRepositoryImpl implements TicketRepository {
  async getAll(): Promise<Ticket[]> {
    const { data } = await apiClient.get<Ticket[]>('/tickets');
    return data;
  }

  async getById(id: string): Promise<Ticket> {
    const { data } = await apiClient.get<Ticket>(`/tickets/${id}`);
    return data;
  }

  async create(title: string, description: string, priority: TicketPriority): Promise<Ticket> {
    const { data } = await apiClient.post<Ticket>('/tickets', {
      title,
      description,
      priority,
    });
    return data;
  }

  async updateStatus(ticketId: string, status: TicketStatus): Promise<void> {
    await apiClient.patch(`/tickets/${ticketId}/status`, { status });
  }

  async updatePriority(ticketId: string, priority: TicketPriority): Promise<void> {
    await apiClient.patch(`/tickets/${ticketId}/priority`, { priority });
  }

  async assignUser(ticketId: string, userId: string): Promise<void> {
    await apiClient.put(`/tickets/${ticketId}/assign`, { userId });
  }

  async unassignUser(ticketId: string): Promise<void> {
    await apiClient.delete(`/tickets/${ticketId}/assign`);
  }

  async addComment(ticketId: string, text: string): Promise<Comment> {
    const { data } = await apiClient.post<Comment>(`/tickets/${ticketId}/comments`, { text });
    return data;
  }
}
