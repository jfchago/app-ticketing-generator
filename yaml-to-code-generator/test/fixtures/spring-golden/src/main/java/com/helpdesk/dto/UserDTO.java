
package com.helpdesk.dto;

import lombok.Data;

import com.helpdesk.entity.UserRole;



@Data
public class UserDTO {

    private String id;

    private String name;

    private String avatar;

    private UserRole role;


}
