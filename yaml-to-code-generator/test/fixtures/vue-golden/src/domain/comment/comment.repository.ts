// comment.repository.ts — Generated from helpdesk.yaml
import type { Comment } from './comment.types';

export interface CommentRepository {
  addComment(ticketId: string, text: string): Promise<Comment>;
}
