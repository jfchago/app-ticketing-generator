
package com.helpdesk.dto;

import com.helpdesk.entity.Comment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

@Mapper
public interface CommentMapper {
    CommentMapper INSTANCE = Mappers.getMapper(CommentMapper.class);

    CommentDTO toDTO(Comment entity);

    @Mapping(target = "id", ignore = true)

    @Mapping(target = "ticket", ignore = true)

    @Mapping(target = "author", ignore = true)

    Comment toEntity(CommentDTO dto);
}
