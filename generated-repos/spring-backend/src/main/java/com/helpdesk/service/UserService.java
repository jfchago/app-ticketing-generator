
package com.helpdesk.service;

import com.helpdesk.dto.UserDTO;
import com.helpdesk.dto.UserMapper;
import com.helpdesk.entity.User;
import com.helpdesk.repository.UserRepository;



import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.context.ApplicationEventPublisher;

import java.util.List;


@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;



    private final UserMapper userMapper;



    private final ApplicationEventPublisher eventPublisher;




    @Transactional(readOnly = true)

    public List<UserDTO> loadUsers() {
        return userRepository.findAll().stream().map(userMapper::toDTO).toList();
    }



    @Transactional(readOnly = true)

    public UserDTO getById(String id) {
        return userRepository.findById(id).map(userMapper::toDTO).orElseThrow(() -> new RuntimeException("User not found: " + id));
    }



}
