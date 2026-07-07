
package com.helpdesk.config;


import com.helpdesk.entity.User;
import com.helpdesk.entity.UserRole;
import com.helpdesk.repository.UserRepository;


import com.helpdesk.entity.Ticket;
import com.helpdesk.repository.TicketRepository;


import com.helpdesk.entity.Comment;
import com.helpdesk.repository.CommentRepository;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;

@Component
public class DataInitializer implements CommandLineRunner {


    private final UserRepository userRepository;


    private final TicketRepository ticketRepository;


    private final CommentRepository commentRepository;


    public DataInitializer(UserRepository userRepository, TicketRepository ticketRepository, CommentRepository commentRepository) {

        this.userRepository = userRepository;


        this.ticketRepository = ticketRepository;


        this.commentRepository = commentRepository;

    }

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) return;


        User u = new User();
        u.setId("user-1");
        u.setName("Admin");
        u.setRole(UserRole.STAFF);
        userRepository.save(u);

        User u2 = new User();
        u2.setId("user-2");
        u2.setName("Customer Demo");
        u2.setRole(UserRole.CUSTOMER);
        userRepository.save(u2);

    }
}
