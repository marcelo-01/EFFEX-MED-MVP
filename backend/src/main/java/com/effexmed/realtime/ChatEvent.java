package com.effexmed.realtime;

/**
 * Evento enviado ao navegador via WebSocket (destino {@code /user/queue/events}).
 *
 * @param alert se o destinatário deve receber um alerta (som/notificação do navegador).
 *              Para o médico, só é verdadeiro dentro da janela de notificações configurada.
 */
public record ChatEvent(Type type, Long conversationId, Object data, boolean alert) {

    public enum Type {
        MESSAGE_CREATED,
        MESSAGES_READ,
        CONVERSATION_UPDATED,
        TYPING
    }

    public static ChatEvent of(Type type, Long conversationId, Object data) {
        return new ChatEvent(type, conversationId, data, false);
    }
}
