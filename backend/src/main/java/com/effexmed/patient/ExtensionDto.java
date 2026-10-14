package com.effexmed.patient;

import java.time.Instant;
import java.time.LocalDate;

import com.effexmed.chat.ConversationExtension;

public record ExtensionDto(Long id, int days, LocalDate previousExpiresOn, LocalDate newExpiresOn, String note,
        Instant createdAt) {

    public static ExtensionDto from(ConversationExtension extension) {
        return new ExtensionDto(extension.getId(), extension.getDays(), extension.getPreviousExpiresOn(),
                extension.getNewExpiresOn(), extension.getNote(), extension.getCreatedAt());
    }
}
