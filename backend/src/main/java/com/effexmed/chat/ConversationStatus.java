package com.effexmed.chat;

import java.time.LocalDate;

public enum ConversationStatus {
    ACTIVE,
    /** Faltam {@value #EXPIRING_SOON_DAYS} dias ou menos para o fim do prazo. */
    EXPIRING_SOON,
    /** Prazo encerrado: o paciente não pode mais enviar mensagens. */
    EXPIRED;

    public static final int EXPIRING_SOON_DAYS = 3;

    public static ConversationStatus of(Conversation conversation, LocalDate today) {
        if (conversation.isExpired(today)) {
            return EXPIRED;
        }
        return conversation.daysRemaining(today) <= EXPIRING_SOON_DAYS ? EXPIRING_SOON : ACTIVE;
    }
}
