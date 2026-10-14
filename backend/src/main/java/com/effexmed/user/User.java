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
}
