
package com.helpdesk.repository;

import com.helpdesk.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;


@Repository
public interface TicketRepository extends JpaRepository<Ticket, String> {

    List<Ticket> findAllByOrderByCreatedAtDesc();


    boolean existsByTitle(String title);

}
