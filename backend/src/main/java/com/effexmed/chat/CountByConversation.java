package com.effexmed.chat;

/**
 * Projeção para contagens agrupadas por conversa.
 */
public interface CountByConversation {

    Long getConversationId();

    Long getTotal();
}
