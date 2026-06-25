

package com.helpdesk.event;

import com.helpdesk.entity.Ticket;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class TicketAsignadoEvent extends ApplicationEvent {

    private final Ticket entity;



    public TicketAsignadoEvent(Object source, Ticket entity) {
        super(source);
        this.entity = entity;
    }

}
