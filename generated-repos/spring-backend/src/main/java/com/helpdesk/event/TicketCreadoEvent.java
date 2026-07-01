

package com.helpdesk.event;

import com.helpdesk.entity.Ticket;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class TicketCreadoEvent extends ApplicationEvent {

    private final Ticket oldEntity;
    private final Ticket newEntity;
    private final String actor;



    public TicketCreadoEvent(Object source, Ticket oldEntity, Ticket newEntity, String actor) {
        super(source);
        this.oldEntity = oldEntity;
        this.newEntity = newEntity;
        this.actor = actor;
    }

}
