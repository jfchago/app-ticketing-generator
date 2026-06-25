import { defineStore } from "pinia";
import type { Ticket } from "../domain/ticket/ticket.types";

import type { TicketStatus } from "../domain/ticket/ticket.types";

import type { TicketPriority } from "../domain/ticket/ticket.types";

import type { Comment } from "../domain/comment/comment.types";

import { TicketService } from "../domain/ticket/ticket.service";
import { TicketRepositoryImpl } from "../infrastructure/repositories/ticket.repository.impl";

const service = new TicketService(new TicketRepositoryImpl());

// ── Transition table (from YAML) ──
const VALID_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["IN_PROGRESS", "CLOSED"],

  IN_PROGRESS: ["RESOLVED", "OPEN"],

  RESOLVED: ["CLOSED", "IN_PROGRESS"],

  CLOSED: ["OPEN"],
};

interface TicketState {
  tickets: Ticket[];
  current: Ticket | null;
  loading: boolean;
  error: string | null;
}

export const useTicketStore = defineStore("ticket", {
  state: (): TicketState => ({
    tickets: [],
    current: null,
    loading: false,
    error: null,
  }),

  actions: {
    async getAll() {
      this.loading = true;
      this.error = null;
      try {
        this.tickets = await service.getAll();
      } catch (e) {
        this.error = e instanceof Error ? e.message : "Error loading tickets";
      } finally {
        this.loading = false;
      }
    },

    async getById(id: string) {
      this.loading = true;
      this.error = null;
      try {
        this.current = await service.getById(id);
      } catch (e) {
        this.error = e instanceof Error ? e.message : "Error loading ticket";
      } finally {
        this.loading = false;
      }
    },

    async create(
      title: string,
      description: string,
      priority: TicketPriority,
    ): Promise<Ticket> {
      this.loading = true;
      this.error = null;

      if (!(title.trim().length > 0)) {
        this.error = "El título no puede estar vacío";
        this.loading = false;
        return null as unknown as Ticket;
      }

      try {
        const created = await service.create(title, description, priority);
        this.tickets.unshift(created);
        return created;
      } catch (e) {
        this.error = e instanceof Error ? e.message : "Error creating ticket";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async updateStatus(ticketId: string, status: TicketStatus) {
      this.error = null;
      try {
        const ticket = this.tickets.find((t) => t.id === ticketId);
        if (!ticket) {
          this.error = "Ticket not found";
          return;
        }

        if (!VALID_TRANSITIONS[ticket.status]?.includes(status)) {
          this.error = `Invalid transition from ${ticket.status} to ${status}`;
          return;
        }

        if (!(newStatus !== "CLOSED" || ticket.comments.length > 0)) {
          this.error = "Requiere al menos un comentario para cerrar";
          return;
        }

        await service.updateStatus(ticketId, status);
        ticket.status = status;
        if (this.current?.id === ticketId) this.current.status = status;
      } catch (e) {
        this.error = e instanceof Error ? e.message : "Error updating status";
        throw e;
      }
    },

    async updatePriority(ticketId: string, priority: TicketPriority) {
      this.error = null;
      try {
        const ticket = this.tickets.find((t) => t.id === ticketId);
        if (!ticket) {
          this.error = "Ticket not found";
          return;
        }

        if (!(newPriority !== "LOW" || ticket.priority !== "LOW")) {
          this.error = "La prioridad ya es LOW";
          return;
        }

        await service.updatePriority(ticketId, priority);
        ticket.priority = priority;
        if (this.current?.id === ticketId) this.current.priority = priority;
      } catch (e) {
        this.error = e instanceof Error ? e.message : "Error updating priority";
        throw e;
      }
    },

    async assignUser(ticketId: string, userId: string) {
      this.error = null;
      try {
        const ticket = this.tickets.find((t) => t.id === ticketId);
        if (!ticket) {
          this.error = "Ticket not found";
          return;
        }

        await service.assignUser(ticketId, userId);
        ticket.assigneeId = userId;
        if (this.current?.id === ticketId) this.current.assigneeId = userId;
      } catch (e) {
        this.error = e instanceof Error ? e.message : "Error assigning user";
        throw e;
      }
    },

    async unassignUser(ticketId: string) {
      this.error = null;
      try {
        const ticket = this.tickets.find((t) => t.id === ticketId);
        if (!ticket) {
          this.error = "Ticket not found";
          return;
        }

        await service.unassignUser(ticketId);
        ticket.assigneeId = null;
        if (this.current?.id === ticketId) this.current.assigneeId = null;
      } catch (e) {
        this.error = e instanceof Error ? e.message : "Error unassigning user";
        throw e;
      }
    },

    async addComment(ticketId: string, text: string): Promise<Comment> {
      this.error = null;
      try {
        const ticket = this.tickets.find((t) => t.id === ticketId);
        if (!ticket) {
          this.error = "Ticket not found";
          return null as unknown as Comment;
        }

        const createdComment = await service.addComment(ticketId, text);
        if (this.current?.id === ticketId)
          this.current.comments.push(createdComment);
        return createdComment;
      } catch (e) {
        this.error = e instanceof Error ? e.message : "Error adding comment";
        throw e;
      }
    },
  },
});
