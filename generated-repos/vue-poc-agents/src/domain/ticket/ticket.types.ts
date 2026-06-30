// ticket.types.ts — Generated from helpdesk.yaml
import type { Comment } from '../comment/comment.types';
import type { TicketStatus } from '../enums';
import { TicketStatus_LABELS } from '../enums';
export type { TicketStatus };
export { TicketStatus_LABELS };
import type { TicketPriority } from '../enums';
import { TicketPriority_LABELS } from '../enums';
export type { TicketPriority };
export { TicketPriority_LABELS };

export interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string | null;
  comments: Comment[];
}
