package com.effexmed.chat;

import java.time.Instant;

public record MessageDto(
        Long id,
        Long conversationId,
        Long senderId,
        String senderName,
        MessageType type,
        String content,
        Instant sentAt,
        Instant readAt,
        boolean outsideBusinessHours) {

    public static MessageDto from(Message message) {
        return new MessageDto(
                message.getId(),
                message.getConversation().getId(),
                message.getSenderId(),
                message.getSender() == null ? null : message.getSender().getName(),
                message.getType(),
                message.getContent(),
                message.getSentAt(),
                message.getReadAt(),
                message.isOutsideBusinessHours());
    }
}
