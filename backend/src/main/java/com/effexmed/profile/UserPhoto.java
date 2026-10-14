package com.effexmed.profile;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Foto de perfil, guardada separada da tabela de usuários para não carregar a imagem a cada consulta.
 * A chave é o próprio id do usuário.
 */
@Entity
@Table(name = "user_photos")
public class UserPhoto {

    public static final int MAX_BYTES = 2 * 1024 * 1024;

    @Id
    private Long userId;

    @Column(nullable = false, length = 20)
    private String contentType;

    @Column(nullable = false, length = MAX_BYTES)
    private byte[] data;

    @Column(nullable = false)
    private Instant updatedAt;

    protected UserPhoto() {
    }

    public UserPhoto(Long userId) {
        this.userId = userId;
    }

    public void replace(String contentType, byte[] data, Instant updatedAt) {
        this.contentType = contentType;
        this.data = data;
        this.updatedAt = updatedAt;
    }

    public Long getUserId() {
        return userId;
    }

    public String getContentType() {
        return contentType;
    }

    public byte[] getData() {
        return data;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
