package com.effexmed.settings;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Set;
import java.util.TreeSet;

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

        boolean welcomeMessageEnabled,

        @Size(max = 1000, message = "A mensagem padrão pode ter no máximo 1000 caracteres.")
        String welcomeMessage) {

    public static SettingsDto from(DoctorSettings settings) {
        return new SettingsDto(
                new TreeSet<>(settings.getNotificationDays()),
                settings.getNotificationStart(),
                settings.getNotificationEnd(),
                settings.isWelcomeMessageEnabled(),
                settings.getWelcomeMessage());
    }
}
