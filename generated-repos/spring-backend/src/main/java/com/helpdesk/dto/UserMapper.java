
package com.helpdesk.dto;

import com.helpdesk.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;


@Mapper(componentModel = "spring", unmappedSourcePolicy = ReportingPolicy.IGNORE)
public interface UserMapper {


    UserDTO toDTO(User entity);

    @Mapping(target = "id", ignore = true)

    User toEntity(UserDTO dto);
}
