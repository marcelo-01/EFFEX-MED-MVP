package com.effexmed.chat;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.effexmed.common.ApiException;
import com.effexmed.common.CurrentUser;
import com.effexmed.realtime.ChatEvent;
import com.effexmed.realtime.RealtimePublisher;
import com.effexmed.settings.DoctorSettings;
import com.effexmed.settings.SettingsService;
import com.effexmed.user.User;

/**
 * Regras do chat entre médico e paciente.
 */
@Service
@Transactional
public class ChatService {

    public static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final ConversationRepository conversations;
    private final MessageRepository messages;
    private final SettingsService settingsService;
    private final RealtimePublisher realtime;
    private final Clock clock;

    public ChatService(ConversationRepository conversations, MessageRepository messages,
            SettingsService settingsService, RealtimePublisher realtime, Clock clock) {
        this.conversations = conversations;
        this.messages = messages;
        this.settingsService = settingsService;
        this.realtime = realtime;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<ConversationDto> listConversations(CurrentUser user) {
        // O médico só vê no chat os pacientes que já criaram a conta; os pendentes ficam na aba Pacientes.
        List<Conversation> found = user.isDoctor()
                ? conversations.findByDoctorIdAndPatientIsNotNull(user.id())
                : conversations.findByPatientId(user.id());
        return toDtos(found, user);
    }

    @Transactional(readOnly = true)
    public ConversationDto getConversation(CurrentUser user, Long conversationId) {
        return toDtos(List.of(loadForParticipant(user, conversationId)), user).getFirst();
    }

    @Transactional(readOnly = true)
    public List<MessageDto> getMessages(CurrentUser user, Long conversationId) {
        Conversation conversation = loadForParticipant(user, conversationId);
        return messages.findByConversationIdOrderByIdAsc(conversation.getId()).stream().map(MessageDto::from).toList();
    }

    public MessageDto sendMessage(CurrentUser user, Long conversationId, String content) {
        Conversation conversation = loadForParticipant(user, conversationId);
        DoctorSettings settings = settingsService.forDoctor(conversation.getDoctor().getId());
        ZonedDateTime now = ZonedDateTime.now(clock);
        String text = content.trim();

        List<Message> created = new ArrayList<>();
        boolean notifyDoctor = false;
        if (user.isDoctor()) {
            if (!conversation.isPatientRegistered()) {
                throw ApiException.conflict("O paciente ainda não criou a conta no aplicativo.");
            }
            created.add(messages.save(Message.text(conversation, conversation.getDoctor(), text, now.toInstant(), false)));
        } else {
            if (conversation.isExpired(now.toLocalDate())) {
                throw ApiException.forbidden("O prazo desta conversa terminou em "
                        + DATE_FORMAT.format(conversation.getExpiresOn())
                        + ". Solicite a extensão do prazo ao seu médico para continuar.");
            }
            boolean withinWindow = settings.isWithinNotificationWindow(now);
            boolean patientIsStartingConversation = !messages.existsByConversationIdAndTypeIn(conversation.getId(),
                    EnumSet.of(MessageType.TEXT, MessageType.AUTO_REPLY));
            created.add(messages.save(
                    Message.text(conversation, conversation.getPatient(), text, now.toInstant(), !withinWindow)));
            if (patientIsStartingConversation && settings.shouldSendWelcomeMessage()) {
                created.add(messages.save(Message.autoReply(conversation, conversation.getDoctor(),
                        settings.getWelcomeMessage(), now.toInstant())));
            }
            notifyDoctor = withinWindow;
        }
        conversation.registerMessage(now.toInstant());

        for (Message message : created) {
            boolean fromPatient = conversation.getPatient().getId().equals(message.getSenderId());
            publishMessage(conversation, message, fromPatient && notifyDoctor, !fromPatient);
        }
        return MessageDto.from(created.getFirst());
    }

    public void markAsRead(CurrentUser user, Long conversationId) {
        Conversation conversation = loadForParticipant(user, conversationId);
        Instant now = clock.instant();
        if (messages.markAsRead(conversation.getId(), user.id(), now) > 0) {
            realtime.publish(conversation.counterpartId(user.id()), ChatEvent.of(ChatEvent.Type.MESSAGES_READ,
                    conversation.getId(), new ReadReceipt(user.id(), now)));
        }
    }

    public ConversationDto requestExtension(CurrentUser user, Long conversationId) {
        if (user.isDoctor()) {
            throw ApiException.forbidden("Apenas o paciente pode solicitar extensão do prazo.");
        }
        Conversation conversation = loadForParticipant(user, conversationId);
        DoctorSettings settings = settingsService.forDoctor(conversation.getDoctor().getId());
        ZonedDateTime now = ZonedDateTime.now(clock);
        if (!conversation.isExpired(now.toLocalDate())) {
            throw ApiException.conflict("A conversa ainda está dentro do prazo.");
        }
        if (!settings.isAllowExtensionRequests()) {
            throw ApiException.forbidden("Este médico não aceita solicitações de extensão pelo aplicativo.");
        }
        if (conversation.getExtensionRequestedAt() == null) {
            conversation.requestExtension(now.toInstant());
            Message message = messages.save(Message.system(conversation,
                    "Solicitação de extensão do prazo enviada ao médico.", now.toInstant()));
            conversation.registerMessage(now.toInstant());
            publishMessage(conversation, message, settings.isWithinNotificationWindow(now), false);
            publishConversationUpdated(conversation);
        }
        return toDtos(List.of(conversation), user).getFirst();
    }

    @Transactional(readOnly = true)
    public void notifyTyping(CurrentUser user, Long conversationId) {
        Conversation conversation = loadForParticipant(user, conversationId);
        realtime.publish(conversation.counterpartId(user.id()),
                ChatEvent.of(ChatEvent.Type.TYPING, conversation.getId(), Map.of("userId", user.id())));
    }

    /** Registra um aviso do sistema na conversa (ex.: prazo estendido) e avisa os participantes. */
    public void postSystemMessage(Conversation conversation, String content) {
        Instant now = clock.instant();
        Message message = messages.save(Message.system(conversation, content, now));
        conversation.registerMessage(now);
        publishMessage(conversation, message, false, true);
    }

    /** Pede para os participantes recarregarem os dados da conversa (prazo, status etc.). */
    public void publishConversationUpdated(Conversation conversation) {
        ChatEvent event = ChatEvent.of(ChatEvent.Type.CONVERSATION_UPDATED, conversation.getId(), null);
        realtime.publish(conversation.getDoctor().getId(), event);
        if (conversation.getPatient() != null) {
            realtime.publish(conversation.getPatient().getId(), event);
        }
    }

    private void publishMessage(Conversation conversation, Message message, boolean notifyDoctor,
            boolean notifyPatient) {
        MessageDto dto = MessageDto.from(message);
        realtime.publish(conversation.getDoctor().getId(),
                new ChatEvent(ChatEvent.Type.MESSAGE_CREATED, conversation.getId(), dto, notifyDoctor));
        if (conversation.getPatient() != null) {
            realtime.publish(conversation.getPatient().getId(),
                    new ChatEvent(ChatEvent.Type.MESSAGE_CREATED, conversation.getId(), dto, notifyPatient));
        }
    }

    private Conversation loadForParticipant(CurrentUser user, Long conversationId) {
        return conversations.findWithParticipantsById(conversationId)
                .filter(conversation -> conversation.hasParticipant(user.id()))
                .orElseThrow(() -> ApiException.notFound("Conversa não encontrada."));
    }

    private List<ConversationDto> toDtos(List<Conversation> list, CurrentUser user) {
        if (list.isEmpty()) {
            return List.of();
        }
        List<Long> ids = list.stream().map(Conversation::getId).toList();
        Map<Long, Message> lastMessages = messages.findLastMessages(ids).stream()
                .collect(Collectors.toMap(m -> m.getConversation().getId(), Function.identity()));
        Map<Long, Long> unread = messages.countUnread(ids, user.id()).stream()
                .collect(Collectors.toMap(CountByConversation::getConversationId, CountByConversation::getTotal));
        Map<Long, DoctorSettings> settingsByDoctor = settingsService
                .forDoctors(list.stream().map(c -> c.getDoctor().getId()).distinct().toList()).stream()
                .collect(Collectors.toMap(s -> s.getDoctor().getId(), Function.identity()));

        ZonedDateTime now = ZonedDateTime.now(clock);
        LocalDate today = now.toLocalDate();
        return list.stream()
                .sorted(Comparator.comparing(ChatService::lastActivity).reversed())
                .map(conversation -> {
                    DoctorSettings settings = settingsByDoctor.get(conversation.getDoctor().getId());
                    Message last = lastMessages.get(conversation.getId());
                    boolean expired = conversation.isExpired(today);
                    return new ConversationDto(
                            conversation.getId(),
                            counterpart(conversation, user),
                            conversation.getExpiresOn(),
                            conversation.daysRemaining(today),
                            ConversationStatus.of(conversation, today),
                            user.isDoctor() ? conversation.isPatientRegistered() : !expired,
                            conversation.getExtensionRequestedAt() != null,
                            settings.isAllowExtensionRequests(),
                            last == null ? null : MessageDto.from(last),
                            unread.getOrDefault(conversation.getId(), 0L),
                            new ConversationDto.DoctorAvailability(new TreeSet<>(settings.getNotificationDays()),
                                    settings.getNotificationStart(), settings.getNotificationEnd(),
                                    settings.isWithinNotificationWindow(now)));
                })
                .toList();
    }

    private static ConversationDto.Participant counterpart(Conversation conversation, CurrentUser user) {
        if (user.isDoctor()) {
            User patient = conversation.getPatient();
            return new ConversationDto.Participant(patient == null ? null : patient.getId(),
                    conversation.patientDisplayName(), conversation.getPatientEmail(), conversation.getPatientEmail());
        }
        User doctor = conversation.getDoctor();
        String detail = doctor.getSpecialty() == null || doctor.getSpecialty().isBlank()
                ? "CRM " + doctor.getCrm()
                : doctor.getSpecialty() + " · CRM " + doctor.getCrm();
        return new ConversationDto.Participant(doctor.getId(), doctor.getName(), doctor.getEmail(), detail);
    }

    private static Instant lastActivity(Conversation conversation) {
        return conversation.getLastMessageAt() != null ? conversation.getLastMessageAt() : conversation.getCreatedAt();
    }

    public record ReadReceipt(Long readerId, Instant readAt) {
    }
}
