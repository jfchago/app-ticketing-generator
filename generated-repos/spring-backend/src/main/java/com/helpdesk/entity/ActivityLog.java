
package com.helpdesk.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;




import java.time.LocalDateTime;


import java.util.UUID;




@Entity
@Table(name = "activity_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor

public class ActivityLog {



    @Id





    private String id;














    @Column(nullable = false, length = 50)



    private String actionType;










    @Column(nullable = false, length = 36)



    private String actorId;










    @Column(length = 100)



    private String actorName;










    @Column(length = 100)



    private String fieldName;










    @Column(length = 4000)



    private String oldValue;










    @Column(length = 4000)



    private String newValue;










    @Column(length = 2000)



    private String description;










    @Column(nullable = false)



    private LocalDateTime createdAt;






    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticketId")
    private Ticket ticket;




    @PrePersist
    protected void onCreate() {

        if (this.id == null) {
            this.id = UUID.randomUUID().toString();
        }


        this.createdAt = LocalDateTime.now();

    }

}
