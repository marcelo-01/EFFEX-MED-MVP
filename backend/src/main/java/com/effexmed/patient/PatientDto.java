package com.effexmed.patient;

import java.time.Instant;
import java.time.LocalDate;

import com.effexmed.chat.ConversationStatus;

/**
 * Paciente na visão do painel administrativo do médico.
 */
public record PatientDto(
        Long conversationId,
        String name,
        String email,
        String photoUrl,
        /** Se o paciente já criou a conta no aplicativo. */
        boolean registered,
        LocalDate expiresOn,
        long daysRemaining,
        ConversationStatus status,
        Instant createdAt,
        Instant lastMessageAt,
        long unreadCount,
        boolean extensionRequested,
        long extensionCount,
        /** Só é possível remover pacientes que ainda não trocaram mensagens. */
        boolean removable) {
}
