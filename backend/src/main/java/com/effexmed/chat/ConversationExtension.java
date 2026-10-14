package com.effexmed.chat;

import java.time.Instant;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Histórico de extensões de prazo. No futuro, cada registro poderá ser vinculado a um pagamento.
 */
@Entity
@Table(name = "conversation_extensions")
public class ConversationExtension {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @Column(nullable = false)
    private int days;

    @Column(nullable = false)
    private LocalDate previousExpiresOn;

    @Column(nullable = false)
    private LocalDate newExpiresOn;

    @Column(length = 255)
    private String note;

    @Column(nullable = false)
    private Instant createdAt;

    protected ConversationExtension() {
    }

    public ConversationExtension(Conversation conversation, int days, LocalDate previousExpiresOn,
            LocalDate newExpiresOn, String note, Instant createdAt) {
        this.conversation = conversation;
        this.days = days;
        this.previousExpiresOn = previousExpiresOn;
        this.newExpiresOn = newExpiresOn;
        this.note = note == null || note.isBlank() ? null : note.trim();
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public Conversation getConversation() {
        return conversation;
    }

    public int getDays() {
        return days;
    }

    public LocalDate getPreviousExpiresOn() {
        return previousExpiresOn;
    }

    public LocalDate getNewExpiresOn() {
        return newExpiresOn;
    }

    public String getNote() {
        return note;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
