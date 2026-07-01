

package com.helpdesk.event;

import com.helpdesk.entity.Ticket;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ManagerApruebaEventPublisher {

    private final ApplicationEventPublisher eventPublisher;


    public void publish(Ticket entity) {
        ManagerApruebaEvent event = new ManagerApruebaEvent(this, entity);
        eventPublisher.publishEvent(event);
    }

}
