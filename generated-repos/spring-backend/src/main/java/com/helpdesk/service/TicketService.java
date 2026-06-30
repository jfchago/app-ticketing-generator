
package com.helpdesk.service;

import com.helpdesk.dto.TicketDTO;
import com.helpdesk.dto.TicketMapper;
import com.helpdesk.entity.Ticket;
import com.helpdesk.repository.TicketRepository;

import com.helpdesk.entity.User;
import com.helpdesk.repository.UserRepository;


import com.helpdesk.entity.TicketStatus;

import com.helpdesk.entity.TicketPriority;


import com.helpdesk.entity.Comment;
import com.helpdesk.repository.CommentRepository;
import com.helpdesk.dto.CommentMapper;
import com.helpdesk.dto.CommentDTO;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.context.ApplicationEventPublisher;

import com.helpdesk.event.TicketCreadoEventPublisher;

import com.helpdesk.event.TicketAsignadoEventPublisher;

import com.helpdesk.event.TicketCerradoEventPublisher;

import java.util.List;

import java.util.UUID;
import java.time.LocalDateTime;


@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;

    private final UserRepository userRepository;


    private final CommentRepository commentRepository;


    private final TicketMapper ticketMapper;


    private final CommentMapper commentMapper;


    private final TicketCreadoEventPublisher ticketCreadoEventPublisher;

    private final TicketAsignadoEventPublisher ticketAsignadoEventPublisher;

    private final TicketCerradoEventPublisher ticketCerradoEventPublisher;




    @Transactional(readOnly = true)

    public List<TicketDTO> getAll() {
        return ticketRepository.findAll().stream().map(ticketMapper::toDTO).toList();
    }



    @Transactional(readOnly = true)

    public TicketDTO getById(String id) {
        return ticketRepository.findById(id).map(ticketMapper::toDTO).orElseThrow(() -> new RuntimeException("Ticket not found: " + id));
    }



    @Transactional

    public TicketDTO create(TicketDTO dto) {
        Ticket ticket = ticketMapper.toEntity(dto);
        if (dto.getAssigneeId() != null) {
            ticket.setAssignee(userRepository.getReferenceById(dto.getAssigneeId()));
        }
        if (ticketRepository.existsByTitle(dto.getTitle())) { throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "Ticket with this title already exists"); }
        if (!(ticket.getTitle().trim().length() > 0)) { throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "El título no puede estar vacío"); }
        ticketRepository.save(ticket);
        ticketCreadoEventPublisher.publish(ticket);
        return ticketMapper.toDTO(ticket);
    }



    @Transactional

    public TicketDTO updateStatus(String id, String status) {
        var ticket = ticketRepository.findById(id).orElseThrow(() -> new RuntimeException("Ticket not found: " + id));
        if (!(!"CLOSED".equals(status) || ticket.getComments().size() > 0)) { throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Requiere al menos un comentario para cerrar"); }
        if (!VALID_TRANSITIONS.get(ticket.getStatus().name()).contains(status)) {
          throw new RuntimeException("Invalid transition from " + ticket.getStatus().name() + " to " + status);
        }
        ticket.setStatus(TicketStatus.valueOf(status));
        ticketRepository.save(ticket);
        ticketCerradoEventPublisher.publish(ticket);
        return ticketMapper.toDTO(ticket);
    }



    @Transactional

    public TicketDTO updatePriority(String id, String priority) {
        var ticket = ticketRepository.findById(id).orElseThrow(() -> new RuntimeException("Ticket not found: " + id));
        if (!(!"LOW".equals(priority) || !"LOW".equals(ticket.getPriority().name()))) { throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "La prioridad ya es LOW"); }
        ticket.setPriority(TicketPriority.valueOf(priority));
        ticketRepository.save(ticket);
        return ticketMapper.toDTO(ticket);
    }



    @Transactional

    public TicketDTO assignUser(String id, String userId) {
        var ticket = ticketRepository.findById(id).orElseThrow(() -> new RuntimeException("Ticket not found: " + id));
        ticket.setAssignee(userRepository.getReferenceById(userId));
        ticketRepository.save(ticket);
        ticketAsignadoEventPublisher.publish(ticket);
        return ticketMapper.toDTO(ticket);
    }



    @Transactional

    public TicketDTO unassignUser(String id) {
        var ticket = ticketRepository.findById(id).orElseThrow(() -> new RuntimeException("Ticket not found: " + id));
        ticket.setAssignee(null);
        ticketRepository.save(ticket);
        return ticketMapper.toDTO(ticket);
    }



    @Transactional

    public CommentDTO addComment(String id, String text) {
        var ticket = ticketRepository.findById(id).orElseThrow(() -> new RuntimeException("Ticket not found: " + id));
        Comment comment = new Comment();
        comment.setTicket(ticket);
        comment.setText(text);
        // TODO: set comment author from authentication context
        commentRepository.save(comment);
        return commentMapper.toDTO(comment);
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
