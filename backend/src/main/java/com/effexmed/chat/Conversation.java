package com.effexmed.chat;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import com.effexmed.user.User;

/**
 * Vínculo entre um médico e um paciente (identificado pelo e-mail) e o chat entre eles.
 * <p>
 * O médico cadastra apenas o e-mail; enquanto o paciente não cria a conta, {@code patient} fica nulo.
 * O chat fica disponível para o paciente até {@code expiresOn} (data do retorno, inclusive).
 */
@Entity
@Table(name = "conversations", uniqueConstraints = @UniqueConstraint(columnNames = { "doctor_id", "patient_email" }))
public class Conversation {

    /** Prazo usado quando o médico cadastra o paciente sem informar a data do retorno. */
    public static final int DEFAULT_DURATION_DAYS = 30;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private User doctor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id")
    private User patient;

    @Column(name = "patient_email", nullable = false, length = 160)
    private String patientEmail;

    /** Nome informado pelo médico no cadastro (usado enquanto o paciente não tem conta). */
    @Column(length = 120)
    private String patientName;

    @Column(nullable = false)
    private LocalDate expiresOn;

    @Column(nullable = false)
    private Instant createdAt;

    private Instant lastMessageAt;

    private Instant extensionRequestedAt;

    protected Conversation() {
    }

    public Conversation(User doctor, String patientEmail, String patientName, LocalDate expiresOn, Instant createdAt) {
        this.doctor = doctor;
        this.patientEmail = User.normalizeEmail(patientEmail);
        this.patientName = blankToNull(patientName);
        this.expiresOn = expiresOn;
        this.createdAt = createdAt;
    }

    public boolean isExpired(LocalDate today) {
        return today.isAfter(expiresOn);
    }

    public long daysRemaining(LocalDate today) {
        return ChronoUnit.DAYS.between(today, expiresOn);
    }

    public boolean hasParticipant(Long userId) {
        return doctor.getId().equals(userId) || (patient != null && patient.getId().equals(userId));
    }

    public boolean isPatientRegistered() {
        return patient != null;
    }

    /** Nome a ser exibido para o paciente: o da conta, se existir; senão o informado pelo médico. */
    public String patientDisplayName() {
        if (patient != null) {
            return patient.getName();
        }
        return patientName != null ? patientName : patientEmail;
    }

    public Long counterpartId(Long userId) {
        if (doctor.getId().equals(userId)) {
            return patient != null ? patient.getId() : null;
        }
        return doctor.getId();
    }

    public void linkPatient(User patient) {
        this.patient = patient;
    }

    /**
     * Estende o prazo em {@code days} dias. Se a conversa já expirou, a contagem parte de hoje.
     */
    public LocalDate extend(int days, LocalDate today) {
        LocalDate base = isExpired(today) ? today : expiresOn;
        this.expiresOn = base.plusDays(days);
        this.extensionRequestedAt = null;
        return expiresOn;
    }

    public void changeExpiration(LocalDate expiresOn) {
        this.expiresOn = expiresOn;
        this.extensionRequestedAt = null;
    }

    public void rename(String patientName) {
        this.patientName = blankToNull(patientName);
    }

    public void requestExtension(Instant now) {
        this.extensionRequestedAt = now;
    }

    public void registerMessage(Instant sentAt) {
        if (lastMessageAt == null || sentAt.isAfter(lastMessageAt)) {
            this.lastMessageAt = sentAt;
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public Long getId() {
        return id;
    }

    public User getDoctor() {
        return doctor;
    }

    public User getPatient() {
        return patient;
    }

    public String getPatientEmail() {
        return patientEmail;
    }

    public String getPatientName() {
        return patientName;
    }

    public LocalDate getExpiresOn() {
        return expiresOn;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getLastMessageAt() {
        return lastMessageAt;
    }

    public Instant getExtensionRequestedAt() {
        return extensionRequestedAt;
    }
}
