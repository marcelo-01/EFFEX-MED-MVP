package com.effexmed.auth;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.effexmed.auth.AuthDtos.AuthResponse;
import com.effexmed.auth.AuthDtos.LoginRequest;
import com.effexmed.auth.AuthDtos.RegisterDoctorRequest;
import com.effexmed.auth.AuthDtos.RegisterPatientRequest;
import com.effexmed.auth.AuthDtos.UserDto;
import com.effexmed.chat.ChatService;
import com.effexmed.chat.Conversation;
import com.effexmed.chat.ConversationRepository;
import com.effexmed.common.ApiException;
import com.effexmed.settings.DoctorSettings;
import com.effexmed.settings.DoctorSettingsRepository;
import com.effexmed.user.ConsentType;
import com.effexmed.user.User;
import com.effexmed.user.UserConsent;
import com.effexmed.user.UserConsentRepository;
import com.effexmed.user.UserRepository;

@Service
@Transactional
public class AuthService {

    private final UserRepository users;
    private final UserConsentRepository consents;
    private final DoctorSettingsRepository settings;
    private final ConversationRepository conversations;
    private final ChatService chatService;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final Clock clock;

    public AuthService(UserRepository users, UserConsentRepository consents, DoctorSettingsRepository settings,
            ConversationRepository conversations, ChatService chatService, PasswordEncoder passwordEncoder,
            TokenService tokenService, Clock clock) {
        this.users = users;
        this.consents = consents;
        this.settings = settings;
        this.conversations = conversations;
        this.chatService = chatService;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.clock = clock;
    }

    public AuthResponse registerDoctor(RegisterDoctorRequest request) {
        requireEmailAvailable(request.email());
        User doctor = users.save(User.doctor(request.name().trim(), request.email(),
                passwordEncoder.encode(request.password()), request.crm().trim(), trimToNull(request.specialty()),
                clock.instant()));
        settings.save(DoctorSettings.defaultsFor(doctor));
        recordConsents(doctor, Boolean.TRUE.equals(request.marketingOptIn()), ConsentType.TERMS_OF_USE, ConsentType.PRIVACY_POLICY,
                ConsentType.PROFESSIONAL_DECLARATION);
        return authenticated(doctor);
    }

    /**
     * Cria a conta do paciente e vincula todas as conversas em que algum médico já cadastrou este e-mail.
     */
    public AuthResponse registerPatient(RegisterPatientRequest request) {
        requireEmailAvailable(request.email());
        User patient = users.save(User.patient(request.name().trim(), request.email(),
                passwordEncoder.encode(request.password()), clock.instant()));
        recordConsents(patient, Boolean.TRUE.equals(request.marketingOptIn()), ConsentType.TERMS_OF_USE, ConsentType.PRIVACY_POLICY,
                ConsentType.HEALTH_DATA);
        List<Conversation> pending = conversations.findByPatientEmailAndPatientIsNull(patient.getEmail());
        for (Conversation conversation : pending) {
            conversation.linkPatient(patient);
            chatService.publishConversationUpdated(conversation);
        }
        return authenticated(patient);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = users.findByEmail(User.normalizeEmail(request.email()))
                .filter(found -> passwordEncoder.matches(request.password(), found.getPasswordHash()))
                .orElseThrow(() -> ApiException.unauthorized("E-mail ou senha inválidos."));
        return authenticated(user);
    }

    /**
     * Garante que o token ainda corresponde a um usuário existente (ex.: após recriar o banco de demonstração).
     */
    @Transactional(readOnly = true)
    public UserDto me(Long userId, String tokenEmail) {
        return users.findById(userId)
                .filter(user -> user.getEmail().equals(tokenEmail))
                .map(UserDto::from)
                .orElseThrow(() -> ApiException.unauthorized("Sessão expirada. Faça login novamente."));
    }

    /** Guarda os aceites obrigatórios (já validados no DTO) e o opcional de marketing, se marcado. */
    private void recordConsents(User user, boolean marketingOptIn, ConsentType... required) {
        Instant now = clock.instant();
        List<UserConsent> granted = new ArrayList<>();
        for (ConsentType type : required) {
            granted.add(new UserConsent(user, type, now));
        }
        if (marketingOptIn) {
            granted.add(new UserConsent(user, ConsentType.MARKETING, now));
        }
        consents.saveAll(granted);
    }

    private AuthResponse authenticated(User user) {
        return new AuthResponse(tokenService.issue(user), UserDto.from(user));
    }

    private void requireEmailAvailable(String email) {
        if (users.existsByEmail(User.normalizeEmail(email))) {
            throw ApiException.conflict("Já existe uma conta com este e-mail.");
        }
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
