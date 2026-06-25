
package com.helpdesk.dto;

import com.helpdesk.entity.Ticket;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

@Mapper
public interface TicketMapper {
    TicketMapper INSTANCE = Mappers.getMapper(TicketMapper.class);

    TicketDTO toDTO(Ticket entity);

    @Mapping(target = "id", ignore = true)

    @Mapping(target = "assignee", ignore = true)

    @Mapping(target = "comments", ignore = true)

    Ticket toEntity(TicketDTO dto);
}
