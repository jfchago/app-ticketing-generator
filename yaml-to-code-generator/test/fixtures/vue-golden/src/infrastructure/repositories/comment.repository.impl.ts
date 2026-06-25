import type { Comment } from "../../domain/comment/comment.types";

import type { CommentRepository } from "../../domain/comment/comment.repository";
import { apiClient } from "../api-client";

export class CommentRepositoryImpl implements CommentRepository {
  async addComment(ticketId: string, text: string): Promise<Comment> {
    const { data } = await apiClient.post<Comment>(
      `/comments/${ticketId}/comments`,
      { text },
    );
    return data;
  }
}
