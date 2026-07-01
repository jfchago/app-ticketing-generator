
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


import com.helpdesk.dto.CursorPageDTO;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;


import com.helpdesk.entity.ActivityLog;
import com.helpdesk.repository.ActivityLogRepository;
import com.helpdesk.dto.ActivityLogDTO;
import com.helpdesk.dto.ActivityLogMapper;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.context.ApplicationEventPublisher;

import com.helpdesk.event.TicketCreadoEventPublisher;

import com.helpdesk.event.TicketAsignadoEventPublisher;

import com.helpdesk.event.TicketCerradoEventPublisher;

import com.helpdesk.event.TicketModificadoEventPublisher;

import java.util.List;

import java.util.UUID;
import java.time.LocalDateTime;


@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;

    private final UserRepository userRepository;


    private final CommentRepository commentRepository;


    private final ActivityLogRepository activityLogRepository;


    private final TicketMapper ticketMapper;


    private final CommentMapper commentMapper;


    private final ActivityLogMapper activityLogMapper;


    private final TicketCreadoEventPublisher ticketCreadoEventPublisher;

    private final TicketAsignadoEventPublisher ticketAsignadoEventPublisher;

    private final TicketCerradoEventPublisher ticketCerradoEventPublisher;

    private final TicketModificadoEventPublisher ticketModificadoEventPublisher;




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
        Ticket oldTicket = null;
        String actor = resolveActor();
        ticketCreadoEventPublisher.publish(oldTicket, ticket, actor);
        return ticketMapper.toDTO(ticket);
    }



    @Transactional

    public TicketDTO updateStatus(String id, String status) {
        var ticket = ticketRepository.findById(id).orElseThrow(() -> new RuntimeException("Ticket not found: " + id));
        Ticket oldTicket = new Ticket();
        oldTicket.setStatus(ticket.getStatus());
        if (!(!"CLOSED".equals(status) || ticket.getComments().size() > 0)) { throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Requiere al menos un comentario para cerrar"); }
        if (!VALID_TRANSITIONS.get(ticket.getStatus().name()).contains(status)) {
          throw new RuntimeException("Invalid transition from " + ticket.getStatus().name() + " to " + status);
        }
        ticket.setStatus(TicketStatus.valueOf(status));
        ticketRepository.save(ticket);
        String actor = resolveActor();
        ticketCerradoEventPublisher.publish(oldTicket, ticket, actor);
        return ticketMapper.toDTO(ticket);
    }



    @Transactional

    public TicketDTO updatePriority(String id, String priority) {
        var ticket = ticketRepository.findById(id).orElseThrow(() -> new RuntimeException("Ticket not found: " + id));
        Ticket oldTicket = new Ticket();
        oldTicket.setPriority(ticket.getPriority());
        if (!(!"LOW".equals(priority) || !"LOW".equals(ticket.getPriority().name()))) { throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "La prioridad ya es LOW"); }
        ticket.setPriority(TicketPriority.valueOf(priority));
        ticketRepository.save(ticket);
        String actor = resolveActor();
        ticketModificadoEventPublisher.publish(oldTicket, ticket, actor);
        return ticketMapper.toDTO(ticket);
    }



    @Transactional

    public TicketDTO assignUser(String id, String userId) {
        var ticket = ticketRepository.findById(id).orElseThrow(() -> new RuntimeException("Ticket not found: " + id));
        Ticket oldTicket = new Ticket();
        oldTicket.setAssignee(ticket.getAssignee());
        ticket.setAssignee(userRepository.getReferenceById(userId));
        ticketRepository.save(ticket);
        String actor = resolveActor();
        ticketAsignadoEventPublisher.publish(oldTicket, ticket, actor);
        return ticketMapper.toDTO(ticket);
    }



    @Transactional

    public TicketDTO unassignUser(String id) {
        var ticket = ticketRepository.findById(id).orElseThrow(() -> new RuntimeException("Ticket not found: " + id));
        Ticket oldTicket = new Ticket();
        oldTicket.setAssignee(ticket.getAssignee());
        ticket.setAssignee(null);
        ticketRepository.save(ticket);
        String actor = resolveActor();
        
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



    @Transactional(readOnly = true)

    public CursorPageDTO<ActivityLogDTO> getHistory(String id, int limit, String cursor) {
        if (!ticketRepository.existsById(id)) { throw new RuntimeException("Ticket not found: " + id); }
        int pageSize = Math.min(limit, 100);
        List<ActivityLog> logs;
        boolean hasMore;

        if (cursor == null || cursor.isBlank()) {
          Pageable pageable = PageRequest.of(0, pageSize + 1, Sort.by(Sort.Direction.DESC, "createdAt", "id"));
          logs = activityLogRepository.findByTicket_IdOrderByCreatedAtDesc(id, pageable).getContent();
        } else {
          try {
            String decoded = new String(java.util.Base64.getUrlDecoder().decode(cursor), java.nio.charset.StandardCharsets.UTF_8);
            String[] parts = decoded.split(":", 2);
            if (parts.length != 2) throw new IllegalArgumentException("Invalid cursor format");
            java.time.LocalDateTime cursorCreatedAt = java.time.LocalDateTime.ofInstant(
              java.time.Instant.ofEpochMilli(Long.parseLong(parts[0])), java.time.ZoneOffset.UTC);
            String cursorId = parts[1];
            Pageable pageable = PageRequest.of(0, pageSize + 1);
            logs = activityLogRepository.findByTicketIdAfterCursor(id, cursorCreatedAt, cursorId, pageable);
          } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(
              org.springframework.http.HttpStatus.BAD_REQUEST, "Invalid cursor: " + cursor);
          }
        }

        hasMore = logs.size() > pageSize;
        if (hasMore) logs = logs.subList(0, pageSize);

        String nextCursor = null;
        if (!logs.isEmpty()) {
          ActivityLog last = logs.get(logs.size() - 1);
          nextCursor = java.util.Base64.getUrlEncoder().encodeToString(
            (last.getCreatedAt().toInstant(java.time.ZoneOffset.UTC).toEpochMilli() + ":" + last.getId()).getBytes(java.nio.charset.StandardCharsets.UTF_8));
        }

        return new CursorPageDTO<>(logs.stream().map(activityLogMapper::toDTO).toList(), nextCursor, hasMore);
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


    private String resolveActor() {
        try {
            var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
                return auth.getName();
            }
        } catch (Exception e) {
            // Fall through to system default
        }
        return "system";
    }

}
