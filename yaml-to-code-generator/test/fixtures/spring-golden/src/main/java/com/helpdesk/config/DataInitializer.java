


package com.helpdesk.config;

import com.helpdesk.entity.User;
import com.helpdesk.repository.UserRepository;

import com.helpdesk.entity.Ticket;
import com.helpdesk.entity.TicketStatus;
import com.helpdesk.entity.TicketPriority;
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

        // ── Seed users ──

        {
            User u = new User();
            u.setId("user-1");
            u.setName("Alice Chen");
            u.setAvatar("AC");
            u.setRole("agent");
            userRepository.save(u);
        }

        {
            User u = new User();
            u.setId("user-2");
            u.setName("Bob Martinez");
            u.setAvatar("BM");
            u.setRole("agent");
            userRepository.save(u);
        }

        {
            User u = new User();
            u.setId("user-3");
            u.setName("Carol Smith");
            u.setAvatar("CS");
            u.setRole("viewer");
            userRepository.save(u);
        }

        {
            User u = new User();
            u.setId("user-4");
            u.setName("Dave Wilson");
            u.setAvatar("DW");
            u.setRole("admin");
            userRepository.save(u);
        }



        // ── Seed tickets ──
        User agent1 = userRepository.findById("user-1").orElseThrow();
        User agent2 = userRepository.findById("user-2").orElseThrow();

        {
            Ticket t = new Ticket();
            t.setId("ticket-1");
            t.setTitle("Login page broken");
            t.setDescription("Users cannot log in after the latest deployment");
            t.setStatus(TicketStatus.OPEN);
            t.setPriority(TicketPriority.HIGH);
            t.setAssignee(agent1);
            t.setCreatedAt(LocalDateTime.now().minusDays(3));
            ticketRepository.save(t);
        }
        {
            Ticket t = new Ticket();
            t.setId("ticket-2");
            t.setTitle("Database connection timeout");
            t.setDescription("Connection pool exhausted after peak hours");
            t.setStatus(TicketStatus.IN_PROGRESS);
            t.setPriority(TicketPriority.URGENT);
            t.setAssignee(agent2);
            t.setCreatedAt(LocalDateTime.now().minusDays(2));
            ticketRepository.save(t);
        }
        {
            Ticket t = new Ticket();
            t.setId("ticket-3");
            t.setTitle("Add dark mode");
            t.setDescription("Users requested a dark mode option for the dashboard");
            t.setStatus(TicketStatus.RESOLVED);
            t.setPriority(TicketPriority.MEDIUM);
            t.setAssignee(agent1);
            t.setCreatedAt(LocalDateTime.now().minusDays(1));
            ticketRepository.save(t);
        }



        // ── Seed comments ──
        User viewer = userRepository.findById("user-3").orElseThrow();
        Ticket ticket1 = ticketRepository.findById("ticket-1").orElseThrow();
        Ticket ticket2 = ticketRepository.findById("ticket-2").orElseThrow();
        Ticket ticket3 = ticketRepository.findById("ticket-3").orElseThrow();

        {
            Comment c = new Comment();
            c.setId("comment-1");
            c.setText("We are investigating the login issue");
            c.setTicket(ticket1);
            c.setAuthor(agent1);
            c.setCreatedAt(LocalDateTime.now().minusDays(2));
            commentRepository.save(c);
        }
        {
            Comment c = new Comment();
            c.setId("comment-2");
            c.setText("The connection pool size has been increased");
            c.setTicket(ticket2);
            c.setAuthor(agent2);
            c.setCreatedAt(LocalDateTime.now().minusDays(1));
            commentRepository.save(c);
        }
        {
            Comment c = new Comment();
            c.setId("comment-3");
            c.setText("Dark mode implementation started on the dev branch");
            c.setTicket(ticket3);
            c.setAuthor(viewer);
            c.setCreatedAt(LocalDateTime.now().minusHours(6));
            commentRepository.save(c);
        }

    }
}

