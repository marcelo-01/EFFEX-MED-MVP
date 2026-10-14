package com.effexmed.realtime;

import java.security.Principal;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

import com.effexmed.chat.ChatService;
import com.effexmed.common.CurrentUser;

/**
 * Indicador "digitando..." enviado pelo cliente via STOMP para {@code /app/conversations/{id}/typing}.
 */
@Controller
public class TypingController {

    private final ChatService chatService;

    public TypingController(ChatService chatService) {
        this.chatService = chatService;
    }

    @MessageMapping("/conversations/{id}/typing")
    public void typing(@DestinationVariable Long id, Principal principal) {
        chatService.notifyTyping(CurrentUser.from(principal), id);
    }
}
