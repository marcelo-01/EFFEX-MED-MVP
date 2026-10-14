package com.effexmed.user;

/**
 * Aceites registrados no cadastro (LGPD, Lei nº 13.709/2018).
 */
public enum ConsentType {
    /** Termos de Uso da plataforma. */
    TERMS_OF_USE,
    /** Ciência da Política de Privacidade. */
    PRIVACY_POLICY,
    /** Consentimento específico e destacado para dados de saúde do paciente (art. 11, I). */
    HEALTH_DATA,
    /** Declaração do médico: CRM ativo e dever de sigilo sobre os dados dos pacientes. */
    PROFESSIONAL_DECLARATION,
    /** Comunicações de marketing por e-mail (opcional). */
    MARKETING
}
