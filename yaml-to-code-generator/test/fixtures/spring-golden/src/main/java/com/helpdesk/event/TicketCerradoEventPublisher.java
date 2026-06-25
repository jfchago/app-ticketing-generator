

package com.helpdesk.event;

import com.helpdesk.entity.Ticket;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TicketCerradoEventPublisher {

    private final ApplicationEventPublisher eventPublisher;


    public void publish(Ticket entity) {
        TicketCerradoEvent event = new TicketCerradoEvent(this, entity);
        eventPublisher.publishEvent(event);
    }

}
