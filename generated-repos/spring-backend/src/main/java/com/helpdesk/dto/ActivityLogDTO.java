
package com.helpdesk.dto;

import lombok.Data;


import java.time.LocalDateTime;



@Data
public class ActivityLogDTO {

    private String id;

    private String ticketId;

    private String actionType;

    private String actorId;

    private String fieldName;

    private String oldValue;

    private String newValue;

    private String description;

    private LocalDateTime createdAt;




}
