

import type { Comment } from './comment.types';


import type { CommentRepository } from './comment.repository';

export class CommentService {
  repository: CommentRepository;

  constructor(repository: CommentRepository) {
    this.repository = repository;
  }




  async addComment(ticketId: string, text: string): Promise<Comment> {
    return this.repository.addComment(ticketId, text);
  }



}
