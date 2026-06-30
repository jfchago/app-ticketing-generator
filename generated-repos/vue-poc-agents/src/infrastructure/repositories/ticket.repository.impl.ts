import type { Ticket } from '../../domain/ticket/ticket.types';
import type { TicketStatus, TicketPriority } from '../../domain/ticket/ticket.types';

import type { Comment } from '../../domain/comment/comment.types';

import type { TicketRepository } from '../../domain/ticket/ticket.repository';
import { apiClient } from '../api-client';

export class TicketRepositoryImpl implements TicketRepository {
  async getAll(): Promise<Ticket[]> {
    const { data: responseData } = await apiClient.get<Ticket[]>('/tickets');
    return responseData;
  }

  async getById(id: string): Promise<Ticket> {
    const { data: responseData } = await apiClient.get<Ticket>(`/tickets/${id}`);
    return responseData;
  }

  async create(data: Omit<Ticket, 'id' | 'createdAt'>): Promise<Ticket> {
    const { data: responseData } = await apiClient.post<Ticket>('/tickets', data);
    return responseData;
  }

  async updateStatus(ticketId: string, status: TicketStatus): Promise<Ticket> {
    const { data: responseData } = await apiClient.patch<Ticket>(`/tickets/${ticketId}/status`, {
      status,
    });
    return responseData;
  }

  async updatePriority(ticketId: string, priority: TicketPriority): Promise<Ticket> {
    const { data: responseData } = await apiClient.patch<Ticket>(`/tickets/${ticketId}/priority`, {
      priority,
    });
    return responseData;
  }

  async assignUser(ticketId: string, userId: string): Promise<Ticket> {
    const { data: responseData } = await apiClient.put<Ticket>(`/tickets/${ticketId}/assign`, {
      userId,
    });
    return responseData;
  }

  async unassignUser(ticketId: string): Promise<void> {
    await apiClient.delete(`/tickets/${ticketId}/assign`);
  }

  async addComment(ticketId: string, text: string): Promise<Comment> {
    const { data: responseData } = await apiClient.post<Comment>(`/tickets/${ticketId}/comments`, {
      text,
    });
    return responseData;
  }
}
