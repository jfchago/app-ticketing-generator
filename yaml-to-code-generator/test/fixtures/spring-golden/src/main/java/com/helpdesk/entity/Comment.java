
package com.helpdesk.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;




import java.time.LocalDateTime;


import java.util.UUID;




@Entity
@Table(name = "comments")
@Data
@NoArgsConstructor
@AllArgsConstructor

public class Comment {



    @Id




    private String id;








    @Column(nullable = false, length = 36, insertable = false, updatable = false)



    private String ticketId;








    @Column(nullable = false, length = 2000)



    private String text;








    @Column(nullable = false, length = 36, insertable = false, updatable = false)



    private String authorId;








    @Column(nullable = false)



    private LocalDateTime createdAt;





    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticketId")
    private Ticket ticket;




    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "authorId")
    private User author;




    @PrePersist
    protected void onCreate() {

        if (this.id == null) {
            this.id = UUID.randomUUID().toString();
        }


        this.createdAt = LocalDateTime.now();

    }

}
