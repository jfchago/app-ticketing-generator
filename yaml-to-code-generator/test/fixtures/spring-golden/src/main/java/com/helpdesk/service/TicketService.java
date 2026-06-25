
package com.helpdesk.service;

import com.helpdesk.dto.TicketDTO;
import com.helpdesk.dto.TicketMapper;
import com.helpdesk.entity.Ticket;
import com.helpdesk.repository.TicketRepository;

import com.helpdesk.entity.TicketStatus;

import com.helpdesk.entity.TicketPriority;


import com.helpdesk.dto.CommentDTO;
import com.helpdesk.dto.CommentMapper;
import com.helpdesk.entity.Comment;
import com.helpdesk.repository.CommentRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.context.ApplicationEventPublisher;


import org.hibernate.Hibernate;


import java.util.List;


@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;

    private final CommentRepository commentRepository;


    private final ApplicationEventPublisher eventPublisher;




    @Transactional(readOnly = true)

    public List&lt;TicketDTO&gt; getAll() {
        return ticketRepository.findAll().stream().map(ticketMapper::toDTO).toList();
    }



    @Transactional(readOnly = true)

    public TicketDTO getById(String id) {
        return ticketRepository.findById(id).map(ticketMapper::toDTO).orElseThrow(() -> new RuntimeException("Ticket not found: " + id));
    }



    @Transactional

    public Ticket create(Ticket entity) {
        if (ticketRepository.existsByTitle(entity.getTitle())) { throw new RuntimeException("Title already exists"); }
        if (!(title.trim().length > 0)) { throw new RuntimeException("El título no puede estar vacío"); }
        ticketRepository.save(entity);
        ticketCreadoEventPublisher.publish(ticket);
        return entity;
    }



    @Transactional

    public TicketDTO updateStatus(String id, String status) {
        ticketRepository.findById(id).orElseThrow(() -> new RuntimeException("Ticket not found: " + id));
        ticket.ifPresent(ticket -> if (!(status !== 'CLOSED' || ticket.comments.length > 0)) { throw new RuntimeException("Requiere al menos un comentario para cerrar"); }
        entity.ifPresent(e -> {
          e.setStatus(TicketStatus.valueOf(status));
          ticketRepository.save(e);
        });
        ticketCerradoEventPublisher.publish(ticket);
        return ticketRepository.findById(id).map(ticketMapper::toDTO).orElseThrow();
    }



    @Transactional

    public TicketDTO updatePriority(String id, String priority) {
        ticketRepository.findById(id).orElseThrow();
        if (!(priority !== 'LOW' || ticket.priority !== 'LOW')) { throw new RuntimeException("La prioridad ya es LOW"); }
        entity.setPriority(TicketPriority.valueOf(priority));
        ticketRepository.save(entity);
        return ticketMapper.toDTO(entity);
    }



    @Transactional

    public TicketDTO assignUser(String id, String userId) {
        ticketRepository.findById(id).orElseThrow();
        entity.setAssigneeId(userId);
        ticketRepository.save(entity);
        ticketAsignadoEventPublisher.publish(ticket);
        return ticketMapper.toDTO(entity);
    }



    @Transactional

    public TicketDTO unassignUser(String id) {
        ticketRepository.findById(id).orElseThrow();
        entity.setAssigneeId(null);
        ticketRepository.save(entity);
        return ticketMapper.toDTO(entity);
    }



    @Transactional

    public CommentDTO addComment(String id, String text) {
        ticketRepository.findById(id).orElseThrow();
        Comment comment = new Comment();
        comment.setId(UUID.randomUUID().toString());
        comment.setTicketId(String.valueOf(id));
        comment.setText(text);
        comment.setAuthorId("system");
        comment.setCreatedAt(LocalDateTime.now());
        commentRepository.save(comment);
        return commentMapper.toDTO(comment);
    }



    private void initializeLazyCollections(Ticket entity) {

        Hibernate.initialize(entity.getComments());

    }



    private static final java.util.Map<String, java.util.Set<String>> VALID_TRANSITIONS = java.util.Map.ofEntries(

        java.util.Map.entry("OPEN", java.util.Set.of("IN_PROGRESS", "CLOSED")),

        java.util.Map.entry("IN_PROGRESS", java.util.Set.of("RESOLVED", "OPEN")),

        java.util.Map.entry("RESOLVED", java.util.Set.of("CLOSED", "IN_PROGRESS")),

        java.util.Map.entry("CLOSED", java.util.Set.of("OPEN"))

    );

    private boolean canTransition(String from, String to) {
        java.util.Set<String> allowed = VALID_TRANSITIONS.get(from);
        return allowed != null && allowed.contains(to);
    }

}
