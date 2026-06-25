package com.helpdesk.event;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class MiniHelpDeskEventListener {

    @EventListener
    public void onTicketCreado(TicketCreadoEvent event) {
        log.info("Event received: {}", "TicketCreado");
        log.debug("  source: {}", event.getSource());
    }

    @EventListener
    public void onTicketAsignado(TicketAsignadoEvent event) {
        log.info("Event received: {}", "TicketAsignado");
        log.debug("  source: {}", event.getSource());
    }

    @EventListener
    public void onTicketCerrado(TicketCerradoEvent event) {
        log.info("Event received: {}", "TicketCerrado");
        log.debug("  source: {}", event.getSource());
    }

    @EventListener
    public void onUsuarioResponde(UsuarioRespondeEvent event) {
        log.info("Event received: {}", "UsuarioResponde");
        log.debug("  source: {}", event.getSource());
    }

    @EventListener
    public void onManagerAprueba(ManagerApruebaEvent event) {
        log.info("Event received: {}", "ManagerAprueba");
        log.debug("  source: {}", event.getSource());
    }

}
