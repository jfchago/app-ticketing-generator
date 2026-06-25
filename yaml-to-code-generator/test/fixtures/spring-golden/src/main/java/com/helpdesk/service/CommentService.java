
package com.helpdesk.service;

import com.helpdesk.dto.CommentDTO;
import com.helpdesk.dto.CommentMapper;
import com.helpdesk.entity.Comment;
import com.helpdesk.repository.CommentRepository;


import com.helpdesk.dto.CommentDTO;
import com.helpdesk.dto.CommentMapper;
import com.helpdesk.entity.Comment;
import com.helpdesk.repository.CommentRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.context.ApplicationEventPublisher;



import java.util.List;


@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;

    private final CommentRepository commentRepository;


    private final ApplicationEventPublisher eventPublisher;




    @Transactional

    public CommentDTO addComment(String id, String text) {
        commentRepository.findById(id).orElseThrow();
        Comment comment = new Comment();
        comment.setId(UUID.randomUUID().toString());
        comment.setTicketId(String.valueOf(id));
        comment.setText(text);
        comment.setAuthorId("system");
        comment.setCreatedAt(LocalDateTime.now());
        commentRepository.save(comment);
        return commentMapper.toDTO(comment);
    }




}
