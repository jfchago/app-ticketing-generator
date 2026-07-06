

package com.helpdesk.event;

import com.helpdesk.entity.Ticket;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TicketCreadoEventPublisher {

    private final ApplicationEventPublisher eventPublisher;


    public void publish(Ticket oldEntity, Ticket newEntity, String actor) {
        TicketCreadoEvent event = new TicketCreadoEvent(this, oldEntity, newEntity, actor);
        eventPublisher.publishEvent(event);
    }

}
