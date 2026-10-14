package com.effexmed.realtime;

/**
 * Evento interno da aplicação; é entregue ao usuário somente após o commit da transação.
 */
public record RealtimeEvent(Long recipientId, ChatEvent event) {
}
