
package com.helpdesk.service;

import com.helpdesk.dto.ActivityLogDTO;
import com.helpdesk.dto.ActivityLogMapper;
import com.helpdesk.entity.ActivityLog;
import com.helpdesk.repository.ActivityLogRepository;

import com.helpdesk.entity.Ticket;
import com.helpdesk.repository.TicketRepository;





import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.context.ApplicationEventPublisher;

import java.util.List;


@Service
@RequiredArgsConstructor
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;

    private final TicketRepository ticketRepository;




    private final ActivityLogMapper activityLogMapper;




    private final ApplicationEventPublisher eventPublisher;




    @Transactional(readOnly = true)

    public ActivityLogDTO getById(String id) {
        return activityLogRepository.findById(id).map(activityLogMapper::toDTO).orElseThrow(() -> new RuntimeException("ActivityLog not found: " + id));
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
