package com.effexmed.profile;

import java.time.Instant;
import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import com.effexmed.user.ConsentType;
import com.effexmed.user.Role;

public final class ProfileDtos {

    private ProfileDtos() {
    }

    public record ProfileDto(
            Long id,
            String name,
            String email,
            Role role,
            String crm,
            String specialty,
            String photoUrl,
            boolean marketingOptIn,
            /** Aceites ativos, para o usuário consultar o que autorizou (LGPD, art. 9º). */
            List<ConsentDto> consents) {
    }

    public record ConsentDto(ConsentType type, String documentVersion, Instant grantedAt) {
    }

    /**
     * @param crm obrigatório para médicos; ignorado para pacientes.
     * @param marketingOptIn quando informado, concede ou revoga o consentimento para novidades por e-mail.
     */
    public record UpdateProfileRequest(
            @NotBlank(message = "Informe o nome.")
            @Size(max = 120, message = "O nome pode ter no máximo 120 caracteres.")
            String name,

            @Size(max = 30, message = "O CRM pode ter no máximo 30 caracteres.")
            String crm,

            @Size(max = 80, message = "A especialidade pode ter no máximo 80 caracteres.")
            String specialty,

            Boolean marketingOptIn) {
    }

    public record ChangePasswordRequest(
            @NotBlank(message = "Informe a senha atual.")
            String currentPassword,

            @NotBlank(message = "Informe a nova senha.")
            @Size(min = 6, max = 72, message = "A nova senha deve ter entre 6 e 72 caracteres.")
            String newPassword) {
    }
}
