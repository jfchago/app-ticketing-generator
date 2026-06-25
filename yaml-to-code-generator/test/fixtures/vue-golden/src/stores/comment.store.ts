import { defineStore } from 'pinia';
import type { Comment } from '../domain/comment/comment.types';


import { CommentService } from '../domain/comment/comment.service';
import { CommentRepositoryImpl } from '../infrastructure/repositories/comment.repository.impl';

const service = new CommentService(new CommentRepositoryImpl());


interface CommentState {
  comments: Comment[];
  current: Comment | null;
  loading: boolean;
  error: string | null;
}

export const useCommentStore = defineStore('comment', {
  state: (): CommentState => ({
    comments: [],
    current: null,
    loading: false,
    error: null
  }),

  actions: {


  }
});
