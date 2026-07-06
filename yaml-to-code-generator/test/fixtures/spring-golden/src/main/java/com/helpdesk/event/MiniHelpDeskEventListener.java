
package com.helpdesk.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import com.helpdesk.entity.ActivityLog;
import com.helpdesk.repository.ActivityLogRepository;


import com.helpdesk.repository.TicketRepository;


@Slf4j
@Component
@RequiredArgsConstructor
public class MiniHelpDeskEventListener {

    private final ActivityLogRepository activityLogRepository;

    private final TicketRepository ticketRepository;





    @Async("auditTaskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onTicketCreado(TicketCreadoEvent event) {
        log.info("Event received: {}", "TicketCreado");

        ActivityLog logEntry = new ActivityLog();

        logEntry.setTicket(ticketRepository.getReferenceById(event.getNewEntity().getId()));

        logEntry.setActionType("created");
        logEntry.setActorId(event.getActor());
        logEntry.setCreatedAt(java.time.LocalDateTime.now());

        activityLogRepository.save(logEntry);
    }






    @Async("auditTaskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onTicketAsignado(TicketAsignadoEvent event) {
        log.info("Event received: {}", "TicketAsignado");

        var oldEntity = event.getOldEntity();
        var newEntity = event.getNewEntity();


        if (!java.util.Objects.equals(
                oldEntity.getAssignee(),
                newEntity.getAssignee()
        )) {

            ActivityLog logEntry = new ActivityLog();

            logEntry.setTicket(ticketRepository.getReferenceById(newEntity.getId()));


            logEntry.setActionType(
                "assigned"
            );

            logEntry.setFieldName("assignee");
            logEntry.setOldValue(
                oldEntity.getAssignee() != null
                    ? String.valueOf(oldEntity.getAssignee())
                    : null
            );
            logEntry.setNewValue(
                newEntity.getAssignee() != null
                    ? String.valueOf(newEntity.getAssignee())
                    : null
            );
            logEntry.setActorId(event.getActor());
            logEntry.setCreatedAt(java.time.LocalDateTime.now());

            activityLogRepository.save(logEntry);
        }


    }






    @Async("auditTaskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onTicketCerrado(TicketCerradoEvent event) {
        log.info("Event received: {}", "TicketCerrado");

        var oldEntity = event.getOldEntity();
        var newEntity = event.getNewEntity();


        if (!java.util.Objects.equals(
                (oldEntity.getStatus() != null ? oldEntity.getStatus().name() : null),
                (newEntity.getStatus() != null ? newEntity.getStatus().name() : null)
        )) {

            ActivityLog logEntry = new ActivityLog();

            logEntry.setTicket(ticketRepository.getReferenceById(newEntity.getId()));


            logEntry.setActionType(
                "status_changed"
            );

            logEntry.setFieldName("status");
            logEntry.setOldValue(
                oldEntity.getStatus() != null
                    ? String.valueOf(oldEntity.getStatus())
                    : null
            );
            logEntry.setNewValue(
                newEntity.getStatus() != null
                    ? String.valueOf(newEntity.getStatus())
                    : null
            );
            logEntry.setActorId(event.getActor());
            logEntry.setCreatedAt(java.time.LocalDateTime.now());

            activityLogRepository.save(logEntry);
        }


    }






    @Async("auditTaskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onTicketModificado(TicketModificadoEvent event) {
        log.info("Event received: {}", "TicketModificado");

        var oldEntity = event.getOldEntity();
        var newEntity = event.getNewEntity();


        if (!java.util.Objects.equals(
                (oldEntity.getPriority() != null ? oldEntity.getPriority().name() : null),
                (newEntity.getPriority() != null ? newEntity.getPriority().name() : null)
        )) {

            ActivityLog logEntry = new ActivityLog();

            logEntry.setTicket(ticketRepository.getReferenceById(newEntity.getId()));


            logEntry.setActionType(
                "priority_changed"
            );

            logEntry.setFieldName("priority");
            logEntry.setOldValue(
                oldEntity.getPriority() != null
                    ? String.valueOf(oldEntity.getPriority())
                    : null
            );
            logEntry.setNewValue(
                newEntity.getPriority() != null
                    ? String.valueOf(newEntity.getPriority())
                    : null
            );
            logEntry.setActorId(event.getActor());
            logEntry.setCreatedAt(java.time.LocalDateTime.now());

            activityLogRepository.save(logEntry);
        }


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
