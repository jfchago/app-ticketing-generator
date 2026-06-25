
package com.helpdesk.dto;

import com.helpdesk.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

@Mapper
public interface UserMapper {
    UserMapper INSTANCE = Mappers.getMapper(UserMapper.class);

    UserDTO toDTO(User entity);

    @Mapping(target = "id", ignore = true)

    User toEntity(UserDTO dto);
}
