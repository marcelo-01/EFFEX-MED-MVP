package com.effexmed.settings;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.EnumSet;
import java.util.Set;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import com.effexmed.user.User;

/**
 * Configurações do painel administrativo do médico.
 */
@Entity
@Table(name = "doctor_settings")
public class DoctorSettings {

    public static final LocalTime DEFAULT_START = LocalTime.of(8, 0);
    public static final LocalTime DEFAULT_END = LocalTime.of(18, 0);
    public static final int DEFAULT_CONVERSATION_DAYS = 30;
    public static final int DEFAULT_EXTENSION_DAYS = 15;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false, unique = true)
    private User doctor;

    /** Dias da semana em que o médico quer ser notificado sobre novas mensagens. */
    @Convert(converter = DayOfWeekSetConverter.class)
    @Column(nullable = false, length = 80)
    private Set<DayOfWeek> notificationDays;

    @Column(nullable = false)
    private LocalTime notificationStart;

    @Column(nullable = false)
    private LocalTime notificationEnd;

    /** Prazo padrão (em dias) da conversa a partir do cadastro do paciente, ou seja, até o retorno. */
    @Column(nullable = false)
    private int defaultConversationDays;

    /** Se o paciente pode solicitar extensão do prazo pelo chat depois que ele expira. */
    @Column(nullable = false)
    private boolean allowExtensionRequests;

    /** Sugestão de dias ao estender o prazo de uma conversa. */
    @Column(nullable = false)
    private int defaultExtensionDays;

    @Column(nullable = false)
    private boolean welcomeMessageEnabled;

    /** Mensagem enviada automaticamente quando o paciente inicia a conversa. */
    @Column(length = 1000)
    private String welcomeMessage;

    protected DoctorSettings() {
    }

    public static DoctorSettings defaultsFor(User doctor) {
        DoctorSettings settings = new DoctorSettings();
        settings.doctor = doctor;
        settings.notificationDays = EnumSet.range(DayOfWeek.MONDAY, DayOfWeek.FRIDAY);
        settings.notificationStart = DEFAULT_START;
        settings.notificationEnd = DEFAULT_END;
        settings.defaultConversationDays = DEFAULT_CONVERSATION_DAYS;
        settings.allowExtensionRequests = true;
        settings.defaultExtensionDays = DEFAULT_EXTENSION_DAYS;
        settings.welcomeMessageEnabled = true;
        settings.welcomeMessage = "Olá! Recebi sua mensagem e responderei assim que possível, dentro do meu horário "
                + "de atendimento. Em caso de urgência ou emergência, procure o pronto-socorro mais próximo ou ligue 192.";
        return settings;
    }

    /**
     * Indica se o instante informado está dentro da janela de notificações do médico.
     * Janelas que atravessam a meia-noite (ex.: 20:00 às 02:00) também são suportadas;
     * início igual ao fim significa o dia inteiro.
     */
    public boolean isWithinNotificationWindow(ZonedDateTime moment) {
        if (!notificationDays.contains(moment.getDayOfWeek())) {
            return false;
        }
        LocalTime time = moment.toLocalTime();
        if (notificationStart.equals(notificationEnd)) {
            return true;
        }
        if (notificationStart.isBefore(notificationEnd)) {
            return !time.isBefore(notificationStart) && time.isBefore(notificationEnd);
        }
        return !time.isBefore(notificationStart) || time.isBefore(notificationEnd);
    }

    public boolean shouldSendWelcomeMessage() {
        return welcomeMessageEnabled && welcomeMessage != null && !welcomeMessage.isBlank();
    }

    public void update(Set<DayOfWeek> notificationDays, LocalTime notificationStart, LocalTime notificationEnd,
            int defaultConversationDays, boolean allowExtensionRequests, int defaultExtensionDays,
            boolean welcomeMessageEnabled, String welcomeMessage) {
        // Nova instância para que o Hibernate detecte a alteração do campo convertido.
        this.notificationDays = notificationDays.isEmpty() ? EnumSet.noneOf(DayOfWeek.class) : EnumSet.copyOf(notificationDays);
        this.notificationStart = notificationStart;
        this.notificationEnd = notificationEnd;
        this.defaultConversationDays = defaultConversationDays;
        this.allowExtensionRequests = allowExtensionRequests;
        this.defaultExtensionDays = defaultExtensionDays;
        this.welcomeMessageEnabled = welcomeMessageEnabled;
        this.welcomeMessage = welcomeMessage == null ? null : welcomeMessage.trim();
    }

    public Long getId() {
        return id;
    }

    public User getDoctor() {
        return doctor;
    }

    public Set<DayOfWeek> getNotificationDays() {
        return notificationDays;
    }

    public LocalTime getNotificationStart() {
        return notificationStart;
    }

    public LocalTime getNotificationEnd() {
        return notificationEnd;
    }

    public int getDefaultConversationDays() {
        return defaultConversationDays;
    }

    public boolean isAllowExtensionRequests() {
        return allowExtensionRequests;
    }

    public int getDefaultExtensionDays() {
        return defaultExtensionDays;
    }

    public boolean isWelcomeMessageEnabled() {
        return welcomeMessageEnabled;
    }

    public String getWelcomeMessage() {
        return welcomeMessage;
    }
}
