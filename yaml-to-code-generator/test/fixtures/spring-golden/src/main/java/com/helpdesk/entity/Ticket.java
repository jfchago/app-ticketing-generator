
package com.helpdesk.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;



import lombok.Builder;


import java.time.LocalDateTime;


import java.util.UUID;


import java.util.ArrayList;
import java.util.List;



@Entity
@Table(name = "tickets")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder

public class Ticket {



    @Id




    private String id;








    @Column(nullable = false, length = 200, unique = true)



    private String title;








    @Column(length = 4000)



    private String description;








    @Column(nullable = false)



    @Enumerated(EnumType.STRING)
    private TicketStatus status;








    @Column(nullable = false)



    @Enumerated(EnumType.STRING)
    private TicketPriority priority;








    @Column(length = 36, insertable = false, updatable = false)



    private String assigneeId;








    @Column(nullable = false)



    private LocalDateTime createdAt;










    private LocalDateTime updatedAt;





    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigneeId")
    private User assignee;




    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Comment> comments = new ArrayList<>();




    @PrePersist
    protected void onCreate() {

        if (this.id == null) {
            this.id = UUID.randomUUID().toString();
        }


        this.createdAt = LocalDateTime.now();

    }

}
