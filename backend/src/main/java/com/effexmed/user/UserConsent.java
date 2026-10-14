package com.effexmed.user;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Registro de um aceite feito pelo usuário. Pela LGPD (art. 8º, § 2º), cabe ao controlador provar que
 * obteve o consentimento, por isso guardamos o tipo, a versão do documento aceito e o momento do aceite.
 */
@Entity
@Table(name = "user_consents")
public class UserConsent {

    /** Versão atual dos Termos de Uso e da Política de Privacidade exibidos no cadastro. */
    public static final String CURRENT_DOCUMENTS_VERSION = "1.0";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private ConsentType type;

    @Column(nullable = false, length = 20)
    private String documentVersion;

    @Column(nullable = false)
    private Instant grantedAt;

    protected UserConsent() {
    }

    public UserConsent(User user, ConsentType type, Instant grantedAt) {
        this.user = user;
        this.type = type;
        this.documentVersion = CURRENT_DOCUMENTS_VERSION;
        this.grantedAt = grantedAt;
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public ConsentType getType() {
        return type;
    }

    public String getDocumentVersion() {
        return documentVersion;
    }

    public Instant getGrantedAt() {
        return grantedAt;
    }
}
