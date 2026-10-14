package com.effexmed.settings;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Set;
import java.util.TreeSet;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SettingsDto(
        @NotEmpty(message = "Selecione ao menos um dia para receber notificações.")
        Set<DayOfWeek> notificationDays,

        @NotNull(message = "Informe o horário inicial das notificações.")
        LocalTime notificationStart,

        @NotNull(message = "Informe o horário final das notificações.")
        LocalTime notificationEnd,

        @Min(value = 1, message = "O prazo da conversa deve ser de pelo menos 1 dia.")
        @Max(value = 365, message = "O prazo da conversa pode ser de no máximo 365 dias.")
        int defaultConversationDays,

        boolean allowExtensionRequests,

        @Min(value = 1, message = "A extensão padrão deve ser de pelo menos 1 dia.")
        @Max(value = 365, message = "A extensão padrão pode ser de no máximo 365 dias.")
        int defaultExtensionDays,

        boolean welcomeMessageEnabled,

        @Size(max = 1000, message = "A mensagem padrão pode ter no máximo 1000 caracteres.")
        String welcomeMessage) {

    public static SettingsDto from(DoctorSettings settings) {
        return new SettingsDto(
                new TreeSet<>(settings.getNotificationDays()),
                settings.getNotificationStart(),
                settings.getNotificationEnd(),
                settings.getDefaultConversationDays(),
                settings.isAllowExtensionRequests(),
                settings.getDefaultExtensionDays(),
                settings.isWelcomeMessageEnabled(),
                settings.getWelcomeMessage());
    }
}
