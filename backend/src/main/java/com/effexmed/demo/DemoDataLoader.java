package com.effexmed.demo;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.EnumSet;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.effexmed.chat.ChatService;
import com.effexmed.chat.Conversation;
import com.effexmed.chat.ConversationExtension;
import com.effexmed.chat.ConversationExtensionRepository;
import com.effexmed.chat.ConversationRepository;
import com.effexmed.chat.Message;
import com.effexmed.chat.MessageRepository;
import com.effexmed.config.AppProperties;
import com.effexmed.settings.DoctorSettings;
import com.effexmed.settings.DoctorSettingsRepository;
import com.effexmed.user.User;
import com.effexmed.user.UserRepository;

/**
 * Popula o banco com dados de demonstração (apenas se estiver vazio e {@code app.demo-data=true}).
 * As datas são relativas ao dia atual (contadas em dias úteis), para que a demonstração esteja sempre "em dia".
 * <p>
 * Todas as contas usam a senha {@value #PASSWORD}.
 */
@Component
public class DemoDataLoader implements ApplicationRunner {

    public static final String PASSWORD = "demo123";

    private static final Logger log = LoggerFactory.getLogger(DemoDataLoader.class);

    private final AppProperties properties;
    private final UserRepository users;
    private final DoctorSettingsRepository settings;
    private final ConversationRepository conversations;
    private final ConversationExtensionRepository extensions;
    private final MessageRepository messages;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    private ZonedDateTime now;

    public DemoDataLoader(AppProperties properties, UserRepository users, DoctorSettingsRepository settings,
            ConversationRepository conversations, ConversationExtensionRepository extensions,
            MessageRepository messages, PasswordEncoder passwordEncoder, Clock clock) {
        this.properties = properties;
        this.users = users;
        this.settings = settings;
        this.conversations = conversations;
        this.extensions = extensions;
        this.messages = messages;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!properties.demoData() || users.count() > 0) {
            return;
        }
        now = ZonedDateTime.now(clock);
        LocalDate today = now.toLocalDate();
        String password = passwordEncoder.encode(PASSWORD);

        // Médicos
        User ana = users.save(User.doctor("Dra. Ana Souza", "ana@effexmed.com", password, "123456-SP",
                "Cardiologia", daysAgo(90, 9, 0)));
        DoctorSettings anaSettings = DoctorSettings.defaultsFor(ana);
        anaSettings.update(EnumSet.range(DayOfWeek.MONDAY, DayOfWeek.FRIDAY), LocalTime.of(8, 0), LocalTime.of(18, 0),
                30, true, 15, true,
                "Olá! Aqui é a Dra. Ana Souza. Recebi sua mensagem e vou responder assim que possível, de segunda "
                        + "a sexta, das 8h às 18h. Em caso de urgência, procure o pronto-socorro mais próximo ou ligue 192.");
        settings.save(anaSettings);

        User carlos = users.save(User.doctor("Dr. Carlos Mendes", "carlos@effexmed.com", password, "654321-SP",
                "Clínica Geral", daysAgo(90, 9, 0)));
        DoctorSettings carlosSettings = DoctorSettings.defaultsFor(carlos);
        carlosSettings.update(EnumSet.range(DayOfWeek.MONDAY, DayOfWeek.SATURDAY), LocalTime.of(7, 0),
                LocalTime.of(19, 0), 15, true, 7, true,
                "Olá, aqui é o Dr. Carlos Mendes. Obrigado pelo contato! Respondo as mensagens de segunda a sábado, "
                        + "das 7h às 19h.");
        settings.save(carlosSettings);

        // Pacientes (Lúcia foi cadastrada pela Dra. Ana, mas ainda não criou a conta)
        User joao = users.save(User.patient("João Pereira", "joao@email.com", password, daysAgo(60, 10, 0)));
        User maria = users.save(User.patient("Maria Oliveira", "maria@email.com", password, daysAgo(60, 10, 0)));
        User pedro = users.save(User.patient("Pedro Santos", "pedro@email.com", password, daysAgo(60, 10, 0)));
        User rafael = users.save(User.patient("Rafael Costa", "rafael@email.com", password, daysAgo(5, 10, 0)));

        // Dra. Ana x João: conversa ativa, com mensagem fora do horário e mensagens não lidas.
        Conversation anaJoao = conversation(ana, joao, today.plusDays(18), 9);
        patient(anaJoao, joao, anaSettings, at(9, 9, 12), true,
                "Bom dia, Dra. Ana! Comecei a tomar a losartana ontem, conforme a receita. É normal sentir um pouco "
                        + "de tontura ao levantar?");
        autoReply(anaJoao, anaSettings, at(9, 9, 12).plusSeconds(2));
        doctor(anaJoao, at(9, 10, 5), true,
                "Bom dia, João! Pode acontecer nos primeiros dias, sim. Levante-se devagar e beba bastante água. "
                        + "Se a tontura for forte ou vier acompanhada de desmaio, me avise imediatamente.");
        patient(anaJoao, joao, anaSettings, at(9, 10, 20), true, "Entendido, muito obrigado!");
        patient(anaJoao, joao, anaSettings, at(3, 22, 47), true,
                "Doutora, desculpe o horário. Medi a pressão agora e deu 14 por 9. Devo me preocupar?");
        doctor(anaJoao, at(2, 8, 15), true,
                "Olá, João! Um valor isolado de 14x9 não é motivo de alarme. Continue medindo pela manhã e à noite "
                        + "e anote os valores para trazer no retorno.");
        patient(anaJoao, joao, anaSettings, at(2, 8, 30), true, "Combinado, vou anotar tudo.");
        patient(anaJoao, joao, anaSettings, now.minusMinutes(52), false,
                "Doutora, segue a média da semana: manhã 13x8,5 e noite 13,5x9.");
        patient(anaJoao, joao, anaSettings, now.minusMinutes(50), false, "Posso fazer caminhada todos os dias?");

        // Dra. Ana x Maria: prazo terminando em 2 dias.
        Conversation anaMaria = conversation(ana, maria, today.plusDays(2), 20);
        patient(anaMaria, maria, anaSettings, at(19, 14, 30), true,
                "Boa tarde, doutora. O ecocardiograma ficou pronto. Posso falar sobre o resultado por aqui?");
        autoReply(anaMaria, anaSettings, at(19, 14, 30).plusSeconds(2));
        doctor(anaMaria, at(19, 15, 10), true,
                "Boa tarde, Maria! Pode sim. O que diz a conclusão do laudo?");
        patient(anaMaria, maria, anaSettings, at(19, 15, 22), true,
                "Diz: função sistólica preservada, sem alterações significativas.");
        doctor(anaMaria, at(19, 15, 40), true, "Ótimo resultado! Mantenha a medicação e nos vemos no retorno.");
        patient(anaMaria, maria, anaSettings, at(1, 19, 45), false,
                "Doutora, meu retorno está chegando. Preciso fazer jejum para os exames de sangue?");

        // Dra. Ana x Pedro: prazo expirado, já estendido uma vez e com nova solicitação de extensão.
        Conversation anaPedro = conversation(ana, pedro, today.minusDays(5), 35);
        patient(anaPedro, pedro, anaSettings, at(34, 10, 0), true,
                "Olá, doutora. Fiquei com dúvida: tomo o remédio do colesterol de manhã ou à noite?");
        autoReply(anaPedro, anaSettings, at(34, 10, 0).plusSeconds(2));
        doctor(anaPedro, at(34, 11, 30), true, "Olá, Pedro! A sinvastatina deve ser tomada à noite, antes de dormir.");
        extensions.save(new ConversationExtension(anaPedro, 15, today.minusDays(20), today.minusDays(5),
                "Pagamento confirmado na recepção", at(15, 9, 0).toInstant()));
        system(anaPedro, at(15, 9, 0), "Prazo da conversa estendido por 15 dias. Disponível até "
                + ChatService.DATE_FORMAT.format(today.minusDays(5)) + ".");
        patient(anaPedro, pedro, anaSettings, at(7, 16, 0), true,
                "Obrigado por estender o prazo, doutora. Os exames ficaram ótimos!");
        doctor(anaPedro, at(7, 16, 45), true, "Que ótima notícia, Pedro! Parabéns pela dedicação ao tratamento.");
        anaPedro.requestExtension(at(1, 20, 10).toInstant());
        system(anaPedro, at(1, 20, 10), "Solicitação de extensão do prazo enviada ao médico.");

        // Dra. Ana x Rafael: conversa nova, sem mensagens (bom para demonstrar a mensagem padrão).
        conversation(ana, rafael, today.plusDays(29), 1);

        // Dra. Ana x Lúcia: cadastrada apenas pelo e-mail, aguardando a criação da conta.
        conversations.save(new Conversation(ana, "lucia@email.com", "Lúcia Ferreira", today.plusDays(30),
                now.minusHours(3).toInstant()));

        // Dr. Carlos x João: mesmo paciente atendido por outro médico.
        Conversation carlosJoao = conversation(carlos, joao, today.plusDays(9), 5);
        patient(carlosJoao, joao, carlosSettings, at(5, 18, 20), true,
                "Boa tarde, Dr. Carlos. A dor de garganta melhorou bastante com o anti-inflamatório.");
        autoReply(carlosJoao, carlosSettings, at(5, 18, 20).plusSeconds(2));
        doctor(carlosJoao, at(5, 18, 40), true,
                "Que bom, João! Termine o tratamento de 5 dias, mesmo que os sintomas desapareçam antes.");
        doctor(carlosJoao, at(2, 9, 0), false, "Bom dia, João! Como está se sentindo hoje?");

        // Dr. Carlos x Maria: conversa iniciada pelo médico (sem mensagem automática).
        Conversation carlosMaria = conversation(carlos, maria, today.plusDays(12), 3);
        doctor(carlosMaria, at(3, 17, 0), true,
                "Olá, Maria! Conforme conversamos na consulta: tomar o antibiótico de 8 em 8 horas, por 7 dias.");
        patient(carlosMaria, maria, carlosSettings, at(3, 17, 30), true, "Obrigada, doutor!");

        log.info("Dados de demonstração criados. Senha de todas as contas: {}", PASSWORD);
    }

    private Conversation conversation(User doctor, User patient, LocalDate expiresOn, int createdDaysAgo) {
        Conversation conversation = new Conversation(doctor, patient.getEmail(), patient.getName(), expiresOn,
                daysAgo(createdDaysAgo, 9, 0));
        conversation.linkPatient(patient);
        return conversations.save(conversation);
    }

    private void patient(Conversation conversation, User patient, DoctorSettings doctorSettings, ZonedDateTime at,
            boolean read, String content) {
        save(Message.text(conversation, patient, content, at.toInstant(), !doctorSettings.isWithinNotificationWindow(at)),
                at, read);
    }

    private void doctor(Conversation conversation, ZonedDateTime at, boolean read, String content) {
        save(Message.text(conversation, conversation.getDoctor(), content, at.toInstant(), false), at, read);
    }

    private void autoReply(Conversation conversation, DoctorSettings doctorSettings, ZonedDateTime at) {
        save(Message.autoReply(conversation, conversation.getDoctor(), doctorSettings.getWelcomeMessage(),
                at.toInstant()), at, true);
    }

    private void system(Conversation conversation, ZonedDateTime at, String content) {
        save(Message.system(conversation, content, at.toInstant()), at, false);
    }

    private void save(Message message, ZonedDateTime at, boolean read) {
        if (read) {
            ZonedDateTime readAt = at.plusMinutes(3);
            message.markAsRead((readAt.isAfter(now) ? now : readAt).toInstant());
        }
        messages.save(message);
        message.getConversation().registerMessage(at.toInstant());
    }

    /** Horário em um dia útil, {@code businessDaysAgo} dias úteis antes de hoje (0 = hoje). */
    private ZonedDateTime at(int businessDaysAgo, int hour, int minute) {
        ZonedDateTime day = now;
        int remaining = businessDaysAgo;
        while (remaining > 0) {
            day = day.minusDays(1);
            if (day.getDayOfWeek().getValue() <= DayOfWeek.FRIDAY.getValue()) {
                remaining--;
            }
        }
        return day.with(LocalTime.of(hour, minute));
    }

    private Instant daysAgo(int businessDays, int hour, int minute) {
        return at(businessDays, hour, minute).toInstant();
    }
}
