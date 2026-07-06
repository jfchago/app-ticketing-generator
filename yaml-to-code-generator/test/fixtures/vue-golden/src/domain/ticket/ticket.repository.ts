// ticket.repository.ts — Generated from helpdesk.yaml
import type { Ticket } from './ticket.types';
import type { TicketStatus, TicketPriority } from './ticket.types';
import type { Comment } from '../comment/comment.types';
import type { ActivityLog } from '../activityLog/activityLog.types';
import type { PaginatedResponse } from '../../infrastructure/api-client';

export interface TicketRepository {
  getAll(): Promise<Ticket[]>;
  getById(id: string): Promise<Ticket>;
  create(data: Omit<Ticket, 'id' | 'createdAt'>): Promise<Ticket>;
  updateStatus(ticketId: string, status: TicketStatus): Promise<Ticket>;
  updatePriority(ticketId: string, priority: TicketPriority): Promise<Ticket>;
  assignUser(ticketId: string, userId: string): Promise<Ticket>;
  unassignUser(ticketId: string): Promise<void>;
  addComment(ticketId: string, text: string): Promise<Comment>;
  getHistory(entityId: string): Promise<PaginatedResponse<ActivityLog>>;
}
