package com.effexmed.chat;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.effexmed.common.CurrentUser;

/**
 * Endpoints do chat, usados tanto pelo médico quanto pelo paciente.
 * O envio é feito via REST; o recebimento em tempo real chega pelo WebSocket.
 */
@RestController
@RequestMapping("/api/conversations")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping
    public List<ConversationDto> list(CurrentUser user) {
        return chatService.listConversations(user);
    }

    @GetMapping("/{id}")
    public ConversationDto get(CurrentUser user, @PathVariable Long id) {
        return chatService.getConversation(user, id);
    }

    @GetMapping("/{id}/messages")
    public List<MessageDto> messages(CurrentUser user, @PathVariable Long id) {
        return chatService.getMessages(user, id);
    }

    @PostMapping("/{id}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageDto send(CurrentUser user, @PathVariable Long id, @Valid @RequestBody SendMessageRequest request) {
        return chatService.sendMessage(user, id, request.content());
    }

    @PostMapping("/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAsRead(CurrentUser user, @PathVariable Long id) {
        chatService.markAsRead(user, id);
    }

    @PostMapping("/{id}/extension-request")
    public ConversationDto requestExtension(CurrentUser user, @PathVariable Long id) {
        return chatService.requestExtension(user, id);
    }
}
