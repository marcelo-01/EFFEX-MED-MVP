package com.effexmed.chat;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import com.effexmed.user.User;

@Entity
@Table(name = "messages", indexes = @Index(name = "idx_messages_conversation", columnList = "conversation_id, id"))
public class Message {

    public static final int MAX_LENGTH = 2000;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    /** Nulo para mensagens do sistema. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id")
    private User sender;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MessageType type;

    @Column(nullable = false, length = MAX_LENGTH)
    private String content;

    @Column(nullable = false)
    private Instant sentAt;

    private Instant readAt;

    /** Mensagem do paciente recebida fora da janela de notificações do médico. */
    @Column(nullable = false)
    private boolean outsideBusinessHours;

    protected Message() {
    }

    private Message(Conversation conversation, User sender, MessageType type, String content, Instant sentAt,
            boolean outsideBusinessHours) {
        this.conversation = conversation;
        this.sender = sender;
        this.type = type;
        this.content = content;
        this.sentAt = sentAt;
        this.outsideBusinessHours = outsideBusinessHours;
    }

    public static Message text(Conversation conversation, User sender, String content, Instant sentAt,
            boolean outsideBusinessHours) {
        return new Message(conversation, sender, MessageType.TEXT, content, sentAt, outsideBusinessHours);
    }

    public static Message autoReply(Conversation conversation, User doctor, String content, Instant sentAt) {
        return new Message(conversation, doctor, MessageType.AUTO_REPLY, content, sentAt, false);
    }

    public static Message system(Conversation conversation, String content, Instant sentAt) {
        return new Message(conversation, null, MessageType.SYSTEM, content, sentAt, false);
    }

    public void markAsRead(Instant readAt) {
        if (this.readAt == null) {
            this.readAt = readAt;
        }
    }

    public Long getId() {
        return id;
    }

    public Conversation getConversation() {
        return conversation;
    }

    public User getSender() {
        return sender;
    }

    public Long getSenderId() {
        return sender == null ? null : sender.getId();
    }

    public MessageType getType() {
        return type;
    }

    public String getContent() {
        return content;
    }

    public Instant getSentAt() {
        return sentAt;
    }

    public Instant getReadAt() {
        return readAt;
    }

    public boolean isOutsideBusinessHours() {
        return outsideBusinessHours;
    }
}
