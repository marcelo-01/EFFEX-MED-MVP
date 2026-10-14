package com.effexmed.chat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.effexmed.user.ConsentType;
import com.effexmed.user.UserConsent;
import com.effexmed.user.UserConsentRepository;
import com.effexmed.user.UserRepository;
import com.jayway.jsonpath.JsonPath;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ChatFlowIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ConversationRepository conversations;

    @Autowired
    private Clock clock;

    @Autowired
    private UserConsentRepository consents;

    @Autowired
    private UserRepository users;

    @Test
    void signUpRequiresTheLgpdConsentsAndRecordsThem() throws Exception {
        String email = uniqueEmail("paciente");
        perform(post("/api/auth/register/patient"), null, """
                {"name":"Paciente","email":"%s","password":"segredo123","acceptTerms":true,
                 "acceptPrivacyPolicy":true,"consentHealthData":false}""".formatted(email))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.consentHealthData").exists());
        perform(post("/api/auth/register/doctor"), null, """
                {"name":"Dr. Teste","email":"%s","password":"segredo123","crm":"1-SP"}""".formatted(uniqueEmail("medico")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.acceptTerms").exists())
                .andExpect(jsonPath("$.errors.acceptPrivacyPolicy").exists())
                .andExpect(jsonPath("$.errors.professionalDeclaration").exists());

        perform(post("/api/auth/register/patient"), null, """
                {"name":"Paciente","email":"%s","password":"segredo123","acceptTerms":true,
                 "acceptPrivacyPolicy":true,"consentHealthData":true,"marketingOptIn":true}""".formatted(email))
                .andExpect(status().isCreated());
        Long userId = users.findByEmail(email).orElseThrow().getId();
        assertThat(consents.findByUserId(userId))
                .extracting(UserConsent::getType)
                .containsExactlyInAnyOrder(ConsentType.TERMS_OF_USE, ConsentType.PRIVACY_POLICY,
                        ConsentType.HEALTH_DATA, ConsentType.MARKETING);
    }

    @Test
    void conversationAppearsWhenThePatientSignsUpWithTheRegisteredEmail() throws Exception {
        String doctor = registerDoctor();
        String otherDoctor = registerDoctor();
        String email = uniqueEmail("paciente");

        perform(post("/api/doctor/patients"), doctor, "{\"email\":\"" + email.toUpperCase() + "\",\"name\":\"Fulano\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.registered").value(false))
                .andExpect(jsonPath("$.email").value(email));
        perform(post("/api/doctor/patients"), otherDoctor, "{\"email\":\"" + email + "\"}")
                .andExpect(status().isCreated());

        // Antes do cadastro do paciente, o médico ainda não vê a conversa no chat.
        perform(get("/api/conversations"), doctor, null).andExpect(jsonPath("$", hasSize(0)));

        String patient = registerPatient(email);

        // Vários médicos podem cadastrar o mesmo paciente.
        perform(get("/api/conversations"), patient, null)
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].canSend").value(true));
        perform(get("/api/conversations"), doctor, null)
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].counterpart.name").value("Paciente Teste"));
        perform(get("/api/doctor/patients"), doctor, null).andExpect(jsonPath("$[0].registered").value(true));
    }

    @Test
    void welcomeMessageIsSentOnlyWhenThePatientStartsTheConversation() throws Exception {
        String doctor = registerDoctor();
        String email = uniqueEmail("paciente");
        long conversationId = registerPatientFor(doctor, email);
        String patient = registerPatient(email);

        sendMessage(patient, conversationId, "Olá, doutora!").andExpect(status().isCreated());
        sendMessage(patient, conversationId, "Tenho uma dúvida.").andExpect(status().isCreated());

        String body = perform(get("/api/conversations/" + conversationId + "/messages"), doctor, null)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<String> types = JsonPath.read(body, "$[*].type");
        assertThat(types).containsExactly("TEXT", "AUTO_REPLY", "TEXT");
    }

    @Test
    void noWelcomeMessageWhenTheDoctorStartsTheConversation() throws Exception {
        String doctor = registerDoctor();
        String email = uniqueEmail("paciente");
        long conversationId = registerPatientFor(doctor, email);
        String patient = registerPatient(email);

        sendMessage(doctor, conversationId, "Olá! Como está?").andExpect(status().isCreated());
        sendMessage(patient, conversationId, "Bem, obrigado.").andExpect(status().isCreated());

        perform(get("/api/conversations/" + conversationId + "/messages"), patient, null)
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].type").value(org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is("TEXT"))));
    }

    @Test
    void patientCannotSendMessagesAfterTheDeadlineUntilTheDoctorExtendsIt() throws Exception {
        String doctor = registerDoctor();
        String email = uniqueEmail("paciente");
        long conversationId = registerPatientFor(doctor, email);
        String patient = registerPatient(email);
        expire(conversationId);

        sendMessage(patient, conversationId, "Ainda posso falar?").andExpect(status().isForbidden());
        perform(get("/api/conversations/" + conversationId), patient, null)
                .andExpect(jsonPath("$.status").value("EXPIRED"))
                .andExpect(jsonPath("$.canSend").value(false));
        // O médico continua podendo escrever.
        sendMessage(doctor, conversationId, "Vou estender o seu prazo.").andExpect(status().isCreated());

        perform(post("/api/conversations/" + conversationId + "/extension-request"), patient, null)
                .andExpect(jsonPath("$.extensionRequested").value(true));
        perform(get("/api/doctor/patients"), doctor, null).andExpect(jsonPath("$[0].extensionRequested").value(true));

        LocalDate today = LocalDate.now(clock);
        perform(post("/api/doctor/patients/" + conversationId + "/extensions"), doctor, "{\"days\":15,\"note\":\"Pago\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.expiresOn").value(today.plusDays(15).toString()))
                .andExpect(jsonPath("$.extensionRequested").value(false))
                .andExpect(jsonPath("$.extensionCount").value(1));

        sendMessage(patient, conversationId, "Obrigado!").andExpect(status().isCreated());
        perform(get("/api/doctor/patients/" + conversationId + "/extensions"), doctor, null)
                .andExpect(jsonPath("$[0].days").value(15))
                .andExpect(jsonPath("$[0].note").value("Pago"));
    }

    @Test
    void patientMessagesOutsideTheNotificationWindowAreFlagged() throws Exception {
        String doctor = registerDoctor();
        String email = uniqueEmail("paciente");
        long conversationId = registerPatientFor(doctor, email);
        String patient = registerPatient(email);

        // Janela de notificações que começa daqui a 1 hora: agora está fora do horário.
        ZonedDateTime now = ZonedDateTime.now(clock);
        String start = now.plusHours(1).toLocalTime().withSecond(0).withNano(0).toString();
        String end = now.plusHours(2).toLocalTime().withSecond(0).withNano(0).toString();
        perform(put("/api/doctor/settings"), doctor, """
                {"notificationDays":["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"],
                 "notificationStart":"%s","notificationEnd":"%s","welcomeMessageEnabled":false,
                 "welcomeMessage":null}""".formatted(start, end))
                .andExpect(status().isOk());

        sendMessage(patient, conversationId, "Mensagem fora do horário")
                .andExpect(jsonPath("$.outsideBusinessHours").value(true));
        perform(get("/api/conversations/" + conversationId), patient, null)
                .andExpect(jsonPath("$.doctorAvailability.availableNow").value(false));
    }

    @Test
    void readReceiptsClearTheUnreadCounter() throws Exception {
        String doctor = registerDoctor();
        String email = uniqueEmail("paciente");
        long conversationId = registerPatientFor(doctor, email);
        String patient = registerPatient(email);
        sendMessage(patient, conversationId, "Oi").andExpect(status().isCreated());

        perform(get("/api/conversations"), doctor, null).andExpect(jsonPath("$[0].unreadCount").value(1));
        perform(post("/api/conversations/" + conversationId + "/read"), doctor, null).andExpect(status().isNoContent());
        perform(get("/api/conversations"), doctor, null).andExpect(jsonPath("$[0].unreadCount").value(0));
        perform(get("/api/conversations/" + conversationId + "/messages"), patient, null)
                .andExpect(jsonPath("$[0].readAt").isNotEmpty());
    }

    @Test
    void accessIsRestrictedToTheConversationParticipants() throws Exception {
        String doctor = registerDoctor();
        String email = uniqueEmail("paciente");
        long conversationId = registerPatientFor(doctor, email);
        String patient = registerPatient(email);
        String stranger = registerPatient(uniqueEmail("outro"));

        perform(get("/api/conversations/" + conversationId + "/messages"), stranger, null).andExpect(status().isNotFound());
        sendMessage(stranger, conversationId, "Oi").andExpect(status().isNotFound());
        perform(get("/api/doctor/patients"), patient, null).andExpect(status().isForbidden());
        mvc.perform(get("/api/conversations")).andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsDuplicatedPatientsAndInvalidData() throws Exception {
        String doctor = registerDoctor();
        String email = uniqueEmail("paciente");
        registerPatientFor(doctor, email);

        perform(post("/api/doctor/patients"), doctor, "{\"email\":\"" + email + "\"}").andExpect(status().isConflict());
        perform(post("/api/doctor/patients"), doctor, "{\"email\":\"invalido\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.email").exists());
        perform(post("/api/doctor/patients"), doctor,
                "{\"email\":\"" + uniqueEmail("x") + "\",\"expiresOn\":\"" + LocalDate.now(clock).minusDays(1) + "\"}")
                .andExpect(status().isBadRequest());
    }

    // ---------------------------------------------------------------------

    private void expire(long conversationId) {
        Conversation conversation = conversations.findById(conversationId).orElseThrow();
        conversation.changeExpiration(LocalDate.now(clock).minusDays(1));
        conversations.save(conversation);
    }

    private long registerPatientFor(String doctorToken, String email) throws Exception {
        String body = perform(post("/api/doctor/patients"), doctorToken, "{\"email\":\"" + email + "\"}")
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.conversationId")).longValue();
    }

    private ResultActions sendMessage(String token, long conversationId, String content) throws Exception {
        return perform(post("/api/conversations/" + conversationId + "/messages"), token,
                "{\"content\":\"" + content + "\"}");
    }

    private String registerDoctor() throws Exception {
        return token(perform(post("/api/auth/register/doctor"), null, """
                {"name":"Dra. Teste","email":"%s","password":"segredo123","crm":"12345-SP","specialty":"Clínica",
                 "acceptTerms":true,"acceptPrivacyPolicy":true,"professionalDeclaration":true}"""
                .formatted(uniqueEmail("medico"))));
    }

    private String registerPatient(String email) throws Exception {
        return token(perform(post("/api/auth/register/patient"), null, """
                {"name":"Paciente Teste","email":"%s","password":"segredo123",
                 "acceptTerms":true,"acceptPrivacyPolicy":true,"consentHealthData":true}""".formatted(email)));
    }

    private String token(ResultActions result) throws Exception {
        String body = result.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.token");
    }

    private ResultActions perform(MockHttpServletRequestBuilder request, String token, String json) throws Exception {
        if (token != null) {
            request.header("Authorization", "Bearer " + token);
        }
        if (json != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(json);
        }
        return mvc.perform(request);
    }

    private static String uniqueEmail(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8) + "@teste.com";
    }
}
