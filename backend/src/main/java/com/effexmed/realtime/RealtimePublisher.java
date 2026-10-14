package com.effexmed.realtime;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;

/**
 * Publica eventos em tempo real. Os eventos são enfileirados durante a transação e enviados
 * pelo WebSocket apenas depois do commit, para que o cliente nunca receba dados não persistidos.
 */
@Component
public class RealtimePublisher {

    public static final String USER_DESTINATION = "/queue/events";

    private final ApplicationEventPublisher applicationEventPublisher;
    private final SimpMessagingTemplate messagingTemplate;

    public RealtimePublisher(ApplicationEventPublisher applicationEventPublisher,
            SimpMessagingTemplate messagingTemplate) {
        this.applicationEventPublisher = applicationEventPublisher;
        this.messagingTemplate = messagingTemplate;
    }

    public void publish(Long recipientId, ChatEvent event) {
        if (recipientId != null) {
            applicationEventPublisher.publishEvent(new RealtimeEvent(recipientId, event));
        }
    }

    @TransactionalEventListener(fallbackExecution = true)
    public void deliver(RealtimeEvent event) {
        messagingTemplate.convertAndSendToUser(event.recipientId().toString(), USER_DESTINATION, event.event());
    }
}
