package com.effexmed.patient;

import java.time.LocalDate;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import com.effexmed.chat.Conversation;

public final class PatientRequests {

    private PatientRequests() {
    }

    /**
     * @param expiresOn data do retorno; se omitida, a conversa dura {@value Conversation#DEFAULT_DURATION_DAYS} dias.
     */
    public record Register(
            @NotBlank(message = "Informe o e-mail do paciente.")
            @Email(message = "Informe um e-mail válido.")
            @Size(max = 160, message = "O e-mail pode ter no máximo 160 caracteres.")
            String email,

            @Size(max = 120, message = "O nome pode ter no máximo 120 caracteres.")
            String name,

            LocalDate expiresOn) {
    }

    public record Update(
            @Size(max = 120, message = "O nome pode ter no máximo 120 caracteres.")
            String name,

            LocalDate expiresOn) {
    }

    public record Extend(
            @Min(value = 1, message = "A extensão deve ser de pelo menos 1 dia.")
            @Max(value = 365, message = "A extensão pode ser de no máximo 365 dias.")
            int days,

            @Size(max = 255, message = "A observação pode ter no máximo 255 caracteres.")
            String note) {
    }
}
