package com.effexmed.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import com.effexmed.user.Role;
import com.effexmed.user.User;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(
            @NotBlank(message = "Informe o e-mail.") String email,
            @NotBlank(message = "Informe a senha.") String password) {
    }

    public record RegisterDoctorRequest(
            @NotBlank(message = "Informe o nome.")
            @Size(max = 120, message = "O nome pode ter no máximo 120 caracteres.")
            String name,

            @NotBlank(message = "Informe o e-mail.")
            @Email(message = "Informe um e-mail válido.")
            @Size(max = 160, message = "O e-mail pode ter no máximo 160 caracteres.")
            String email,

            @NotBlank(message = "Informe a senha.")
            @Size(min = 6, max = 72, message = "A senha deve ter entre 6 e 72 caracteres.")
            String password,

            @NotBlank(message = "Informe o CRM.")
            @Size(max = 30, message = "O CRM pode ter no máximo 30 caracteres.")
            String crm,

            @Size(max = 80, message = "A especialidade pode ter no máximo 80 caracteres.")
            String specialty) {
    }

    public record RegisterPatientRequest(
            @NotBlank(message = "Informe o nome.")
            @Size(max = 120, message = "O nome pode ter no máximo 120 caracteres.")
            String name,

            @NotBlank(message = "Informe o e-mail.")
            @Email(message = "Informe um e-mail válido.")
            @Size(max = 160, message = "O e-mail pode ter no máximo 160 caracteres.")
            String email,

            @NotBlank(message = "Informe a senha.")
            @Size(min = 6, max = 72, message = "A senha deve ter entre 6 e 72 caracteres.")
            String password) {
    }

    public record UserDto(Long id, String name, String email, Role role, String crm, String specialty) {

        public static UserDto from(User user) {
            return new UserDto(user.getId(), user.getName(), user.getEmail(), user.getRole(), user.getCrm(),
                    user.getSpecialty());
        }
    }

    public record AuthResponse(String token, UserDto user) {
    }
}
