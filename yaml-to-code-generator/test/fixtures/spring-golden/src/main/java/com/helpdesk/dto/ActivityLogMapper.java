
package com.helpdesk.dto;

import com.helpdesk.entity.ActivityLog;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;


@Mapper(componentModel = "spring", unmappedSourcePolicy = ReportingPolicy.IGNORE)
public interface ActivityLogMapper {



    @Mapping(target = "ticketId", source = "ticket.id")

    ActivityLogDTO toDTO(ActivityLog entity);

    @Mapping(target = "id", ignore = true)

    @Mapping(target = "ticket", ignore = true)

    ActivityLog toEntity(ActivityLogDTO dto);
}
