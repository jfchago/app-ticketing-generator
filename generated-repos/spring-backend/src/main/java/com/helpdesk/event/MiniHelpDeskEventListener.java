
package com.helpdesk.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import com.helpdesk.entity.ActivityLog;
import com.helpdesk.repository.ActivityLogRepository;

@Slf4j
@Component
@RequiredArgsConstructor
public class MiniHelpDeskEventListener {

    private final ActivityLogRepository activityLogRepository;




    @Async("auditTaskExecutor")
    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onTicketCreado(TicketCreadoEvent event) {
        log.info("Event received: {}", "TicketCreado");

        ActivityLog logEntry = new ActivityLog();
        logEntry.setTicketId(event.getNewEntity().getId());
        logEntry.setActionType("created");
        logEntry.setActorId(event.getActor());
        logEntry.setCreatedAt(java.time.LocalDateTime.now());

        activityLogRepository.save(logEntry);
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
