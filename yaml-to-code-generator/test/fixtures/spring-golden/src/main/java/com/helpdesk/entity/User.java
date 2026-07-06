
package com.helpdesk.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;




import java.util.UUID;




@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor

public class User {



    @Id





    private String id;










    @Column(nullable = false, length = 100)



    private String name;










    @Column(length = 10)



    private String avatar;










    @Column(nullable = false, length = 20)



    private String role;






    @PrePersist
    protected void onCreate() {

        if (this.id == null) {
            this.id = UUID.randomUUID().toString();
        }


    }

}
