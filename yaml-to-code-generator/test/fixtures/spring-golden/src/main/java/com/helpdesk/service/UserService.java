
package com.helpdesk.service;

import com.helpdesk.dto.UserDTO;
import com.helpdesk.dto.UserMapper;
import com.helpdesk.entity.User;
import com.helpdesk.repository.UserRepository;


import com.helpdesk.entity.UserRole;




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



    @Transactional

    public UserDTO create(UserDTO dto) {
        User user = userMapper.toEntity(dto);

        userRepository.save(user);
        User oldUser = null;
        String actor = resolveActor();
        ticketCreadoEventPublisher.publish(oldUser, user, actor);
        return userMapper.toDTO(user);
    }



    public void update() {

    }




    private String resolveActor() {
        try {
            var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
                return auth.getName();
            }
        } catch (Exception e) {
            // Fall through to system default
        }
        return "system";
    }

}
