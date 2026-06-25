import type { Ticket } from "./ticket.types";

import type { TicketStatus } from "./ticket.types";

import type { TicketPriority } from "./ticket.types";

import type { Comment } from "../comment/comment.types";

import type { TicketRepository } from "./ticket.repository";

export class TicketService {
  repository: TicketRepository;

  constructor(repository: TicketRepository) {
    this.repository = repository;
  }

  async getAll(): Promise<Ticket[]> {
    return this.repository.getAll();
  }

  async getById(id: string): Promise<Ticket> {
    return this.repository.getById(id);
  }

  async create(
    title: string,
    description: string,
    priority: TicketPriority,
  ): Promise<Ticket> {
    return this.repository.create(title, description, priority);
  }

  async updateStatus(ticketId: string, status: TicketStatus): Promise<void> {
    return this.repository.updateStatus(ticketId, status);
  }

  async updatePriority(
    ticketId: string,
    priority: TicketPriority,
  ): Promise<void> {
    return this.repository.updatePriority(ticketId, priority);
  }

  async assignUser(ticketId: string, userId: string): Promise<void> {
    return this.repository.assignUser(ticketId, userId);
  }

  async unassignUser(ticketId: string): Promise<void> {
    return this.repository.unassignUser(ticketId);
  }

  async addComment(ticketId: string, text: string): Promise<Comment> {
    return this.repository.addComment(ticketId, text);
  }
}
