
package com.helpdesk.controller;

import com.helpdesk.dto.TicketDTO;
import com.helpdesk.service.TicketService;

import com.helpdesk.entity.TicketStatus;

import com.helpdesk.entity.TicketPriority;


import com.helpdesk.dto.CommentDTO;


import com.helpdesk.dto.CursorPageDTO;


import com.helpdesk.dto.CommentDTO;

import com.helpdesk.dto.CursorPageDTO;

import com.helpdesk.dto.ActivityLogDTO;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.http.HttpStatus;


import java.util.List;


import java.util.Map;


import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;


@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;



    @GetMapping
    public ResponseEntity<List<TicketDTO>> getAll() {
        return ResponseEntity.ok(ticketService.getAll());
    }




    @GetMapping("/{id}")
    public ResponseEntity<TicketDTO> getById(@PathVariable String id) {
        return ResponseEntity.ok(ticketService.getById(id));
    }




    @PostMapping
    public ResponseEntity<TicketDTO> create(@RequestBody TicketDTO dto) {

        TicketDTO created = ticketService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);

    }




    @PatchMapping("/{id}/status")
    public ResponseEntity<TicketDTO> updateStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {



        return ResponseEntity.ok(ticketService.updateStatus(id, body.get("status")));

    }




    @PatchMapping("/{id}/priority")
    public ResponseEntity<TicketDTO> updatePriority(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {



        return ResponseEntity.ok(ticketService.updatePriority(id, body.get("priority")));

    }




    @PutMapping("/{id}/assign")
    public ResponseEntity<TicketDTO> assignUser(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String val = body.get("userId");
        return ResponseEntity.ok(ticketService.assignUser(id, val));
    }




    @DeleteMapping("/{id}/assign")
    public ResponseEntity<TicketDTO> unassignUser(@PathVariable String id) {
        return ResponseEntity.ok(ticketService.unassignUser(id));
    }




    @PostMapping("/{id}/comments")
    public ResponseEntity<CommentDTO> addComment(@PathVariable String id, @RequestBody java.util.Map<String, String> body) {

        String bodyValue = body.get("text");
        return ResponseEntity.status(HttpStatus.CREATED).body(ticketService.addComment(id, bodyValue));

    }




    @GetMapping("/{id}/history")
    public ResponseEntity<CursorPageDTO<ActivityLogDTO>> getHistory(@PathVariable String id, @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit, @RequestParam(required = false) String cursor) {
        return ResponseEntity.ok(ticketService.getHistory(id, limit, cursor));
    }



}
