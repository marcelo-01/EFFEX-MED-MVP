package com.effexmed.config;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.stereotype.Component;

/**
 * Autentica a sessão WebSocket com o mesmo JWT da API, enviado no header {@code Authorization}
 * do frame CONNECT. Só permite assinar as filas privadas do próprio usuário.
 */
@Component
public class StompAuthInterceptor implements ChannelInterceptor {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtDecoder jwtDecoder;
    private final JwtAuthenticationConverter jwtAuthenticationConverter;

    public StompAuthInterceptor(JwtDecoder jwtDecoder, JwtAuthenticationConverter jwtAuthenticationConverter) {
        this.jwtDecoder = jwtDecoder;
        this.jwtAuthenticationConverter = jwtAuthenticationConverter;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }
        StompCommand command = accessor.getCommand();
        if (StompCommand.CONNECT.equals(command)) {
            String authorization = accessor.getFirstNativeHeader("Authorization");
            if (authorization == null || !authorization.startsWith(BEARER_PREFIX)) {
                throw new MessageDeliveryException("Token de acesso ausente.");
            }
            try {
                Jwt jwt = jwtDecoder.decode(authorization.substring(BEARER_PREFIX.length()));
                accessor.setUser(jwtAuthenticationConverter.convert(jwt));
            } catch (JwtException ex) {
                throw new MessageDeliveryException("Token de acesso inválido.");
            }
        } else if (StompCommand.SUBSCRIBE.equals(command) || StompCommand.SEND.equals(command)) {
            if (accessor.getUser() == null) {
                throw new MessageDeliveryException("Sessão WebSocket não autenticada.");
            }
            String destination = accessor.getDestination();
            if (StompCommand.SUBSCRIBE.equals(command) && (destination == null || !destination.startsWith("/user/queue/"))) {
                throw new MessageDeliveryException("Destino não permitido.");
            }
        }
        return message;
    }
}
