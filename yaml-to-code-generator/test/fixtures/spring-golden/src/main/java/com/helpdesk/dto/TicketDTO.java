
package com.helpdesk.dto;

import lombok.Data;

import com.helpdesk.entity.TicketStatus;

import com.helpdesk.entity.TicketPriority;


import java.time.LocalDateTime;


import java.util.List;


@Data
public class TicketDTO {

    private String id;

    private String title;

    private String description;

    private TicketStatus status;

    private TicketPriority priority;

    private String assigneeId;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;





    private List<CommentDTO> comments;


}
