package com.effexmed.chat;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

/**
 * Conversa sob o ponto de vista de quem está consultando (médico ou paciente).
 */
public record ConversationDto(
        Long id,
        Participant counterpart,
        LocalDate expiresOn,
        long daysRemaining,
        ConversationStatus status,
        /** Se o usuário atual pode enviar mensagens agora. */
        boolean canSend,
        boolean extensionRequested,
        MessageDto lastMessage,
        long unreadCount,
        DoctorAvailability doctorAvailability) {

    public record Participant(Long id, String name, String email, String detail) {
    }

    /** Janela de atendimento do médico, exibida ao paciente no chat. */
    public record DoctorAvailability(Set<DayOfWeek> days, LocalTime start, LocalTime end, boolean availableNow) {
    }
}
