
package com.helpdesk.controller;

import com.helpdesk.dto.CommentDTO;
import com.helpdesk.service.CommentService;


import com.helpdesk.dto.CommentDTO;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.http.HttpStatus;



import java.util.Map;


@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;



    @PostMapping("/{id}/comments")
    public ResponseEntity<CommentDTO> addComment(@PathVariable String id) {

        CommentDTO created = commentService.addComment(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);

    }



}
