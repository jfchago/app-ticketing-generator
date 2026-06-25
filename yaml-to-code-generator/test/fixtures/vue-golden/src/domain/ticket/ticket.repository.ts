// ticket.repository.ts — Generated from helpdesk.yaml
import type { Ticket } from "./ticket.types";
import type { TicketStatus, TicketPriority } from "./ticket.types";
import type { Comment } from "../comment/comment.types";

export interface TicketRepository {
  getAll(): Promise<Ticket[]>;
  getById(id: string): Promise<Ticket>;
  create(
    title: string,
    description: string,
    priority: TicketPriority,
  ): Promise<Ticket>;
  updateStatus(ticketId: string, status: TicketStatus): Promise<void>;
  updatePriority(ticketId: string, priority: TicketPriority): Promise<void>;
  assignUser(ticketId: string, userId: string): Promise<void>;
  unassignUser(ticketId: string): Promise<void>;
  addComment(ticketId: string, text: string): Promise<Comment>;
}
