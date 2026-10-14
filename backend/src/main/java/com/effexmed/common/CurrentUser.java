package com.effexmed.common;

import java.security.Principal;

import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import com.effexmed.user.Role;

/**
 * Usuário autenticado, extraído do JWT. Injetado nos controllers via {@link CurrentUserArgumentResolver}.
 */
public record CurrentUser(Long id, Role role) {

    public boolean isDoctor() {
        return role == Role.DOCTOR;
    }

    public static CurrentUser from(Principal principal) {
        if (principal instanceof JwtAuthenticationToken token) {
            return new CurrentUser(Long.valueOf(token.getName()), Role.valueOf(token.getToken().getClaimAsString("role")));
        }
        throw new AuthenticationCredentialsNotFoundException("Usuário não autenticado");
    }
}
