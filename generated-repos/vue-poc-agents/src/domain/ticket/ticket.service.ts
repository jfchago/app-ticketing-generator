

import type { Ticket } from './ticket.types';

import type { TicketStatus } from './ticket.types';

import type { TicketPriority } from './ticket.types';


import type { Comment } from '../comment/comment.types';


import type { ActivityLog } from '../activityLog/activityLog.types';
import type { PaginatedResponse } from '../../infrastructure/api-client';

import type { TicketRepository } from './ticket.repository';

export interface TicketServiceHooks {



  beforeGetAll?(): Promise<void> | void;

  afterGetAll?(result: Ticket[]): Promise<void> | void;




  beforeGetById?(id: string): Promise<void> | void;

  afterGetById?(result: Ticket): Promise<void> | void;




  beforeCreate?(data: Omit<Ticket, 'id' | 'createdAt'>): Promise<void> | void;

  afterCreate?(result: Ticket): Promise<void> | void;




  beforeUpdateStatus?(ticketId: string, status: TicketStatus): Promise<void> | void;

  afterUpdateStatus?(result: Ticket): Promise<void> | void;




  beforeUpdatePriority?(ticketId: string, priority: TicketPriority): Promise<void> | void;

  afterUpdatePriority?(result: Ticket): Promise<void> | void;




  beforeAssignUser?(ticketId: string, userId: string): Promise<void> | void;

  afterAssignUser?(result: Ticket): Promise<void> | void;




  beforeUnassignUser?(ticketId: string): Promise<void> | void;

  afterUnassignUser?(): Promise<void> | void;




  beforeAddComment?(ticketId: string, text: string): Promise<void> | void;

  afterAddComment?(result: Comment): Promise<void> | void;




  beforeGetHistory?(entityId: string): Promise<void> | void;

  afterGetHistory?(result: PaginatedResponse<ActivityLog>): Promise<void> | void;


}

export class TicketService {
  repository: TicketRepository;
  private readonly hooks?: Partial<TicketServiceHooks>;

  constructor(repository: TicketRepository, hooks?: Partial<TicketServiceHooks>) {
    this.repository = repository;
    this.hooks = hooks;
  }





  async getAll(): Promise<Ticket[]> {
    try { await this.hooks?.beforeGetAll?.(); } catch {}
    const result = await this.repository.getAll();
    try { await this.hooks?.afterGetAll?.(result); } catch {}
    return result;
  }







  async getById(id: string): Promise<Ticket> {
    try { await this.hooks?.beforeGetById?.(id); } catch {}

    const result = await this.repository.getById(id);
    try { await this.hooks?.afterGetById?.(result); } catch {}
    return result;

  }







  async create(data: Omit<Ticket, 'id' | 'createdAt'>): Promise<Ticket> {
    try { await this.hooks?.beforeCreate?.(data); } catch {}

    const result = await this.repository.create(data);
    try { await this.hooks?.afterCreate?.(result); } catch {}
    return result;

  }







  async updateStatus(ticketId: string, status: TicketStatus): Promise<Ticket> {
    try { await this.hooks?.beforeUpdateStatus?.(ticketId, status); } catch {}

    const result = await this.repository.updateStatus(ticketId, status);
    try { await this.hooks?.afterUpdateStatus?.(result); } catch {}
    return result;

  }







  async updatePriority(ticketId: string, priority: TicketPriority): Promise<Ticket> {
    try { await this.hooks?.beforeUpdatePriority?.(ticketId, priority); } catch {}

    const result = await this.repository.updatePriority(ticketId, priority);
    try { await this.hooks?.afterUpdatePriority?.(result); } catch {}
    return result;

  }







  async assignUser(ticketId: string, userId: string): Promise<Ticket> {
    try { await this.hooks?.beforeAssignUser?.(ticketId, userId); } catch {}

    const result = await this.repository.assignUser(ticketId, userId);
    try { await this.hooks?.afterAssignUser?.(result); } catch {}
    return result;

  }







  async unassignUser(ticketId: string): Promise<void> {
    try { await this.hooks?.beforeUnassignUser?.(ticketId); } catch {}

    await this.repository.unassignUser(ticketId);
    try { await this.hooks?.afterUnassignUser?.(); } catch {}

  }







  async addComment(ticketId: string, text: string): Promise<Comment> {
    try { await this.hooks?.beforeAddComment?.(ticketId, text); } catch {}

    const result = await this.repository.addComment(ticketId, text);
    try { await this.hooks?.afterAddComment?.(result); } catch {}
    return result;

  }







  async getHistory(entityId: string): Promise<PaginatedResponse<ActivityLog>> {
    try { await this.hooks?.beforeGetHistory?.(entityId); } catch {}

    const result = await this.repository.getHistory(entityId);
    try { await this.hooks?.afterGetHistory?.(result); } catch {}
    return result;

  }


}
