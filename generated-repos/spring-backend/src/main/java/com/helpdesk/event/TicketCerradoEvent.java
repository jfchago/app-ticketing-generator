

package com.helpdesk.event;

import com.helpdesk.entity.Ticket;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class TicketCerradoEvent extends ApplicationEvent {

    private final Ticket entity;



    public TicketCerradoEvent(Object source, Ticket entity) {
        super(source);
        this.entity = entity;
    }

}
