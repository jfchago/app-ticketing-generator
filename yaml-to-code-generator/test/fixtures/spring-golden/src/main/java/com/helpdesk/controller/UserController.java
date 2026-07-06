
package com.helpdesk.controller;

import com.helpdesk.dto.UserDTO;
import com.helpdesk.service.UserService;




import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


import java.util.List;




@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;



    @GetMapping
    public ResponseEntity<List<UserDTO>> loadUsers() {
        return ResponseEntity.ok(userService.loadUsers());
    }




    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getById(@PathVariable String id) {
        return ResponseEntity.ok(userService.getById(id));
    }



}
