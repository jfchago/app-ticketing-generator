

package com.helpdesk.event;

import com.helpdesk.entity.Ticket;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class UsuarioRespondeEventPublisher {

    private final ApplicationEventPublisher eventPublisher;


    public void publish(Ticket entity) {
        UsuarioRespondeEvent event = new UsuarioRespondeEvent(this, entity);
        eventPublisher.publishEvent(event);
    }

}
