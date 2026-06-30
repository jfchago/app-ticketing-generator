

package com.helpdesk.event;

import com.helpdesk.entity.Ticket;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TicketAsignadoEventPublisher {

    private final ApplicationEventPublisher eventPublisher;


    public void publish(Ticket entity) {
        TicketAsignadoEvent event = new TicketAsignadoEvent(this, entity);
        eventPublisher.publishEvent(event);
    }

}
