package com.effexmed.profile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.effexmed.chat.ChatService;
import com.effexmed.chat.ConversationRepository;
import com.effexmed.common.ApiException;
import com.effexmed.profile.ProfileDtos.ChangePasswordRequest;
import com.effexmed.profile.ProfileDtos.ConsentDto;
import com.effexmed.profile.ProfileDtos.ProfileDto;
import com.effexmed.profile.ProfileDtos.UpdateProfileRequest;
import com.effexmed.user.ConsentType;
import com.effexmed.user.User;
import com.effexmed.user.UserConsent;
import com.effexmed.user.UserConsentRepository;
import com.effexmed.user.UserRepository;

/**
 * Perfil do usuário logado (médico ou paciente): dados, foto, senha e consentimento de comunicações.
 */
@Service
@Transactional
public class ProfileService {

    private final UserRepository users;
    private final UserConsentRepository consents;
    private final UserPhotoRepository photos;
    private final ConversationRepository conversations;
    private final ChatService chatService;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    public ProfileService(UserRepository users, UserConsentRepository consents, UserPhotoRepository photos,
            ConversationRepository conversations, ChatService chatService, PasswordEncoder passwordEncoder,
            Clock clock) {
        this.users = users;
        this.consents = consents;
        this.photos = photos;
        this.conversations = conversations;
        this.chatService = chatService;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public ProfileDto get(Long userId) {
        return toDto(load(userId));
    }

    public ProfileDto update(Long userId, UpdateProfileRequest request) {
        User user = load(userId);
        user.rename(request.name());
        if (user.isDoctor()) {
            if (request.crm() == null || request.crm().isBlank()) {
                throw ApiException.badRequest("Informe o CRM.");
            }
            user.updateProfessionalInfo(request.crm(), request.specialty());
        }
        if (request.marketingOptIn() != null) {
            updateMarketingConsent(user, request.marketingOptIn());
        }
        notifyContacts(user);
        return toDto(user);
    }

    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = load(userId);
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw ApiException.badRequest("A senha atual está incorreta.");
        }
        user.changePassword(passwordEncoder.encode(request.newPassword()));
    }

    public ProfileDto updatePhoto(Long userId, MultipartFile file) {
        byte[] data = read(file);
        if (data.length == 0) {
            throw ApiException.badRequest("Selecione uma imagem.");
        }
        if (data.length > UserPhoto.MAX_BYTES) {
            throw ApiException.badRequest("A foto deve ter no máximo 2 MB.");
        }
        ImageFormat format = ImageFormat.detect(data)
                .orElseThrow(() -> ApiException.badRequest("Envie uma imagem JPG, PNG ou WebP."));

        User user = load(userId);
        Instant now = clock.instant();
        UserPhoto photo = photos.findById(userId).orElseGet(() -> new UserPhoto(userId));
        photo.replace(format.contentType(), data, now);
        photos.save(photo);
        user.photoChanged(now);
        notifyContacts(user);
        return toDto(user);
    }

    public ProfileDto removePhoto(Long userId) {
        User user = load(userId);
        photos.deleteById(userId);
        user.photoRemoved();
        notifyContacts(user);
        return toDto(user);
    }

    /**
     * A foto só é visível para o próprio usuário e para quem tem vínculo com ele (médico ⇄ paciente).
     * Para os demais, responde como se não existisse.
     */
    @Transactional(readOnly = true)
    public UserPhoto photoFor(Long viewerId, Long ownerId) {
        boolean allowed = viewerId.equals(ownerId)
                || conversations.existsByDoctorIdAndPatientId(viewerId, ownerId)
                || conversations.existsByDoctorIdAndPatientId(ownerId, viewerId);
        if (!allowed) {
            throw ApiException.notFound("Foto não encontrada.");
        }
        return photos.findById(ownerId).orElseThrow(() -> ApiException.notFound("Foto não encontrada."));
    }

    private void updateMarketingConsent(User user, boolean optIn) {
        List<UserConsent> active = consents.findByUserIdAndRevokedAtIsNullOrderByGrantedAtAsc(user.getId()).stream()
                .filter(consent -> consent.getType() == ConsentType.MARKETING)
                .toList();
        Instant now = clock.instant();
        if (optIn && active.isEmpty()) {
            consents.save(new UserConsent(user, ConsentType.MARKETING, now));
        } else if (!optIn) {
            active.forEach(consent -> consent.revoke(now));
        }
    }

    /** Atualiza nome e foto nas telas de quem conversa com o usuário. */
    private void notifyContacts(User user) {
        conversations.findByDoctorIdOrPatientId(user.getId(), user.getId())
                .forEach(chatService::publishConversationUpdated);
    }

    private ProfileDto toDto(User user) {
        List<UserConsent> active = consents.findByUserIdAndRevokedAtIsNullOrderByGrantedAtAsc(user.getId());
        return new ProfileDto(user.getId(), user.getName(), user.getEmail(), user.getRole(), user.getCrm(),
                user.getSpecialty(), user.photoUrl(),
                active.stream().anyMatch(consent -> consent.getType() == ConsentType.MARKETING),
                active.stream()
                        .map(consent -> new ConsentDto(consent.getType(), consent.getDocumentVersion(),
                                consent.getGrantedAt()))
                        .toList());
    }

    private User load(Long userId) {
        return users.findById(userId).orElseThrow(() -> ApiException.unauthorized("Sessão expirada."));
    }

    private static byte[] read(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }
}
