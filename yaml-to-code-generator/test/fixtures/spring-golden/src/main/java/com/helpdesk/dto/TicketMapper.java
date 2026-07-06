
package com.helpdesk.dto;

import com.helpdesk.entity.Ticket;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;


@Mapper(componentModel = "spring", unmappedSourcePolicy = ReportingPolicy.IGNORE, uses = {CommentMapper.class, ActivityLogMapper.class})
public interface TicketMapper {



    @Mapping(target = "assigneeId", source = "assignee.id")

    TicketDTO toDTO(Ticket entity);

    @Mapping(target = "id", ignore = true)

    @Mapping(target = "assignee", ignore = true)

    @Mapping(target = "comments", ignore = true)

    @Mapping(target = "activityLogs", ignore = true)

    Ticket toEntity(TicketDTO dto);
}
