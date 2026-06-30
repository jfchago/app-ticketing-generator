
package com.helpdesk.dto;

import com.helpdesk.entity.Comment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;


@Mapper(componentModel = "spring", unmappedSourcePolicy = ReportingPolicy.IGNORE)
public interface CommentMapper {


    @Mapping(target = "ticketId", source = "ticket.id")

    @Mapping(target = "authorId", source = "author.id")

    CommentDTO toDTO(Comment entity);

    @Mapping(target = "id", ignore = true)

    @Mapping(target = "ticket", ignore = true)

    @Mapping(target = "author", ignore = true)

    Comment toEntity(CommentDTO dto);
}
