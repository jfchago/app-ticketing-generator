
package com.helpdesk.repository;

import com.helpdesk.entity.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;


import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;


@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, String> {


    org.springframework.data.domain.Page<ActivityLog> findByTicket_IdOrderByCreatedAtDesc(String ticketId, org.springframework.data.domain.Pageable pageable);


    @org.springframework.data.jpa.repository.Query("SELECT a FROM ActivityLog a WHERE a.ticket.id = :ticketId AND (a.createdAt < :cursorCreatedAt OR (a.createdAt = :cursorCreatedAt AND a.id < :cursorId)) ORDER BY a.createdAt DESC, a.id DESC")

    java.util.List<ActivityLog> findByTicketIdAfterCursor(String ticketId, java.time.LocalDateTime cursorCreatedAt, String cursorId, org.springframework.data.domain.Pageable pageable);


}

