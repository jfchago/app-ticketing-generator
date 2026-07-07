
package com.helpdesk.controller;

import com.helpdesk.dto.UserDTO;
import com.helpdesk.service.UserService;

import com.helpdesk.entity.UserRole;




import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.http.HttpStatus;


import java.util.List;


import java.util.Map;



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




    @PostMapping
    public ResponseEntity<UserDTO> create(@RequestBody UserDTO dto) {

        UserDTO created = userService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);

    }




    @PutMapping("/{id}")
    public ResponseEntity<UserDTO> update(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String val = body.get("value");
        return ResponseEntity.ok(userService.update(id, val));
    }



}
