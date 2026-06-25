
package com.helpdesk.dto;

import lombok.Data;


import java.time.LocalDateTime;



@Data
public class CommentDTO {

    private String id;

    private String ticketId;

    private String text;

    private String authorId;

    private LocalDateTime createdAt;






}
