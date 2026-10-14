package com.effexmed.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendMessageRequest(
        @NotBlank(message = "A mensagem não pode estar vazia.")
        @Size(max = Message.MAX_LENGTH, message = "A mensagem pode ter no máximo 2000 caracteres.")
        String content) {
}
