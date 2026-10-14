package com.effexmed.chat;

public enum MessageType {
    /** Mensagem escrita por um dos participantes. */
    TEXT,
    /** Mensagem padrão do médico, enviada automaticamente quando o paciente inicia a conversa. */
    AUTO_REPLY,
    /** Aviso do sistema (ex.: prazo estendido). Não possui remetente. */
    SYSTEM
}
