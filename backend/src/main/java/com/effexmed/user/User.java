package com.effexmed.user;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, unique = true, length = 160)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    /** Registro no Conselho Regional de Medicina (apenas médicos). */
    @Column(length = 30)
    private String crm;

    @Column(length = 80)
    private String specialty;

    @Column(nullable = false)
    private Instant createdAt;

    /** Momento da última troca de foto; nulo quando o usuário não tem foto. Também versiona a URL da imagem. */
    private Instant photoUpdatedAt;

    protected User() {
    }

    private User(String name, String email, String passwordHash, Role role, Instant createdAt) {
        this.name = name;
        this.email = normalizeEmail(email);
        this.passwordHash = passwordHash;
        this.role = role;
        this.createdAt = createdAt;
    }

    public static User doctor(String name, String email, String passwordHash, String crm, String specialty,
            Instant createdAt) {
        User user = new User(name, email, passwordHash, Role.DOCTOR, createdAt);
        user.crm = crm;
        user.specialty = specialty;
        return user;
    }

    public static User patient(String name, String email, String passwordHash, Instant createdAt) {
        return new User(name, email, passwordHash, Role.PATIENT, createdAt);
    }

    public static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    public void rename(String name) {
        this.name = name.trim();
    }

    public void updateProfessionalInfo(String crm, String specialty) {
        this.crm = crm.trim();
        this.specialty = specialty == null || specialty.isBlank() ? null : specialty.trim();
    }

    public void changePassword(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public void photoChanged(Instant updatedAt) {
        this.photoUpdatedAt = updatedAt;
    }

    public void photoRemoved() {
        this.photoUpdatedAt = null;
    }

    /** URL da foto (com versão para cache) ou nulo. O acesso é restrito a quem tem vínculo com o usuário. */
    public String photoUrl() {
        return photoUpdatedAt == null ? null : "/api/users/" + id + "/photo?v=" + photoUpdatedAt.toEpochMilli();
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public Role getRole() {
        return role;
    }

    public boolean isDoctor() {
        return role == Role.DOCTOR;
    }

    public String getCrm() {
        return crm;
    }

    public String getSpecialty() {
        return specialty;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getPhotoUpdatedAt() {
        return photoUpdatedAt;
    }
}
