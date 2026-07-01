
package com.helpdesk.repository;

import com.helpdesk.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;


import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;


@Repository
public interface TicketRepository extends JpaRepository<Ticket, String> {


    List<Ticket> findAllByOrderByCreatedAtDesc();


    org.springframework.data.domain.Page<Ticket> findByTicketIdOrderByCreatedAtDesc(String ticketId, org.springframework.data.domain.Pageable pageable);


    @org.springframework.data.jpa.repository.Query("SELECT a FROM Ticket a WHERE a.ticketId = :ticketId AND (a.createdAt < :cursorCreatedAt OR (a.createdAt = :cursorCreatedAt AND a.id < :cursorId)) ORDER BY a.createdAt DESC, a.id DESC")

    java.util.List<Ticket> findByTicketIdAfterCursor(String ticketId, java.time.LocalDateTime cursorCreatedAt, String cursorId, org.springframework.data.domain.Pageable pageable);


    boolean existsByTitle(String title);

}

