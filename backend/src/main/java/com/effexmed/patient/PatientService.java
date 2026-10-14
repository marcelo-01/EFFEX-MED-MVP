package com.effexmed.patient;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.effexmed.chat.ChatService;
import com.effexmed.chat.Conversation;
import com.effexmed.chat.ConversationExtension;
import com.effexmed.chat.ConversationExtensionRepository;
import com.effexmed.chat.ConversationRepository;
import com.effexmed.chat.ConversationStatus;
import com.effexmed.chat.CountByConversation;
import com.effexmed.chat.MessageRepository;
import com.effexmed.chat.MessageType;
import com.effexmed.common.ApiException;
import com.effexmed.user.User;
import com.effexmed.user.UserRepository;

/**
 * Cadastro e gestão de pacientes pelo médico (painel administrativo).
 */
@Service
@Transactional
public class PatientService {

    private final ConversationRepository conversations;
    private final ConversationExtensionRepository extensions;
    private final MessageRepository messages;
    private final UserRepository users;
    private final ChatService chatService;
    private final Clock clock;

    public PatientService(ConversationRepository conversations, ConversationExtensionRepository extensions,
            MessageRepository messages, UserRepository users, ChatService chatService, Clock clock) {
        this.conversations = conversations;
        this.extensions = extensions;
        this.messages = messages;
        this.users = users;
        this.chatService = chatService;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<PatientDto> list(Long doctorId) {
        return toDtos(conversations.findByDoctorId(doctorId), doctorId);
    }

    /**
     * Cadastra o e-mail do paciente. Se ele já tiver conta, a conversa aparece para ele imediatamente;
     * caso contrário, será vinculada quando ele se cadastrar com este e-mail.
     */
    public PatientDto register(Long doctorId, PatientRequests.Register request) {
        User doctor = users.findById(doctorId).orElseThrow(() -> ApiException.notFound("Médico não encontrado."));
        String email = User.normalizeEmail(request.email());
        if (email.equals(doctor.getEmail())) {
            throw ApiException.badRequest("Você não pode cadastrar o seu próprio e-mail como paciente.");
        }
        if (conversations.existsByDoctorIdAndPatientEmail(doctorId, email)) {
            throw ApiException.conflict("Este paciente já está cadastrado.");
        }
        Optional<User> existingAccount = users.findByEmail(email);
        if (existingAccount.filter(User::isDoctor).isPresent()) {
            throw ApiException.conflict("Este e-mail pertence a uma conta de médico.");
        }

        LocalDate today = LocalDate.now(clock);
        LocalDate expiresOn = request.expiresOn() != null
                ? request.expiresOn()
                : today.plusDays(Conversation.DEFAULT_DURATION_DAYS);
        requireNotInPast(expiresOn, today);

        Conversation conversation = new Conversation(doctor, email, request.name(), expiresOn, clock.instant());
        existingAccount.ifPresent(conversation::linkPatient);
        conversations.save(conversation);
        if (conversation.isPatientRegistered()) {
            chatService.publishConversationUpdated(conversation);
        }
        return toDto(conversation, doctorId);
    }

    public PatientDto update(Long doctorId, Long conversationId, PatientRequests.Update request) {
        Conversation conversation = loadOwned(doctorId, conversationId);
        conversation.rename(request.name());
        if (request.expiresOn() != null && !request.expiresOn().equals(conversation.getExpiresOn())) {
            requireNotInPast(request.expiresOn(), LocalDate.now(clock));
            conversation.changeExpiration(request.expiresOn());
            chatService.postSystemMessage(conversation, "Data de retorno atualizada. A conversa fica disponível até "
                    + ChatService.DATE_FORMAT.format(request.expiresOn()) + ".");
        }
        chatService.publishConversationUpdated(conversation);
        return toDto(conversation, doctorId);
    }

    /**
     * Estende o prazo da conversa. O pagamento da extensão acontece fora da plataforma neste MVP.
     */
    public PatientDto extend(Long doctorId, Long conversationId, PatientRequests.Extend request) {
        Conversation conversation = loadOwned(doctorId, conversationId);
        LocalDate previous = conversation.getExpiresOn();
        LocalDate extendedTo = conversation.extend(request.days(), LocalDate.now(clock));
        extensions.save(new ConversationExtension(conversation, request.days(), previous, extendedTo, request.note(),
                clock.instant()));
        chatService.postSystemMessage(conversation, "Prazo da conversa estendido por " + request.days()
                + (request.days() == 1 ? " dia" : " dias") + ". Disponível até "
                + ChatService.DATE_FORMAT.format(extendedTo) + ".");
        chatService.publishConversationUpdated(conversation);
        return toDto(conversation, doctorId);
    }

    @Transactional(readOnly = true)
    public List<ExtensionDto> extensions(Long doctorId, Long conversationId) {
        Conversation conversation = loadOwned(doctorId, conversationId);
        return extensions.findByConversationIdOrderByCreatedAtDesc(conversation.getId()).stream()
                .map(ExtensionDto::from)
                .toList();
    }

    public void remove(Long doctorId, Long conversationId) {
        Conversation conversation = loadOwned(doctorId, conversationId);
        if (hasConversationHistory(conversation.getId())) {
            throw ApiException.conflict("Não é possível remover um paciente que já possui histórico de conversa.");
        }
        messages.deleteByConversationId(conversation.getId());
        extensions.deleteByConversationId(conversation.getId());
        conversations.delete(conversation);
        chatService.publishConversationUpdated(conversation);
    }

    private boolean hasConversationHistory(Long conversationId) {
        return messages.existsByConversationIdAndTypeIn(conversationId,
                EnumSet.of(MessageType.TEXT, MessageType.AUTO_REPLY));
    }

    private Conversation loadOwned(Long doctorId, Long conversationId) {
        return conversations.findWithParticipantsById(conversationId)
                .filter(conversation -> conversation.getDoctor().getId().equals(doctorId))
                .orElseThrow(() -> ApiException.notFound("Paciente não encontrado."));
    }

    private static void requireNotInPast(LocalDate expiresOn, LocalDate today) {
        if (expiresOn.isBefore(today)) {
            throw ApiException.badRequest("A data de retorno não pode estar no passado.");
        }
    }

    private PatientDto toDto(Conversation conversation, Long doctorId) {
        return toDtos(List.of(conversation), doctorId).getFirst();
    }

    private List<PatientDto> toDtos(List<Conversation> list, Long doctorId) {
        if (list.isEmpty()) {
            return List.of();
        }
        List<Long> ids = list.stream().map(Conversation::getId).toList();
        Map<Long, Long> unread = toMap(messages.countUnread(ids, doctorId));
        Map<Long, Long> extensionCounts = toMap(extensions.countByConversation(ids));
        Map<Long, Long> textMessages = toMap(messages.countByTypes(ids, EnumSet.of(MessageType.TEXT, MessageType.AUTO_REPLY)));
        LocalDate today = LocalDate.now(clock);

        return list.stream()
                .sorted(Comparator.comparing(Conversation::getCreatedAt).reversed())
                .map(conversation -> new PatientDto(
                        conversation.getId(),
                        conversation.patientDisplayName(),
                        conversation.getPatientEmail(),
                        conversation.isPatientRegistered(),
                        conversation.getExpiresOn(),
                        conversation.daysRemaining(today),
                        ConversationStatus.of(conversation, today),
                        conversation.getCreatedAt(),
                        conversation.getLastMessageAt(),
                        unread.getOrDefault(conversation.getId(), 0L),
                        conversation.getExtensionRequestedAt() != null,
                        extensionCounts.getOrDefault(conversation.getId(), 0L),
                        textMessages.getOrDefault(conversation.getId(), 0L) == 0))
                .toList();
    }

    private static Map<Long, Long> toMap(List<CountByConversation> counts) {
        return counts.stream()
                .collect(Collectors.toMap(CountByConversation::getConversationId, CountByConversation::getTotal));
    }
}
