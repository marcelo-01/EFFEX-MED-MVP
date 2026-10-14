package com.effexmed.profile;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.jayway.jsonpath.JsonPath;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProfileIntegrationTest {

    /** Menor PNG válido (1x1). */
    private static final byte[] PNG = {
            (byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 0, 0, 0, 13, 'I', 'H', 'D', 'R', 0, 0, 0, 1, 0, 0, 0, 1,
            8, 6, 0, 0, 0, 0x1F, 0x15, (byte) 0xC4, (byte) 0x89, 0, 0, 0, 10, 'I', 'D', 'A', 'T', 0x78, (byte) 0x9C,
            0x63, 0, 1, 0, 0, 5, 0, 1, 0x0D, 0x0A, 0x2D, (byte) 0xB4, 0, 0, 0, 0, 'I', 'E', 'N', 'D', (byte) 0xAE,
            0x42, 0x60, (byte) 0x82 };

    @Autowired
    private MockMvc mvc;

    @Test
    void doctorUpdatesNameAndProfessionalInfo() throws Exception {
        String doctor = registerDoctor(uniqueEmail("medico"));

        perform(put("/api/profile"), doctor, """
                {"name":"Dra. Nova Silva","crm":"999-RJ","specialty":"Pediatria"}""")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Dra. Nova Silva"))
                .andExpect(jsonPath("$.crm").value("999-RJ"))
                .andExpect(jsonPath("$.specialty").value("Pediatria"));
        perform(put("/api/profile"), doctor, """
                {"name":"Dra. Nova Silva","crm":" "}""")
                .andExpect(status().isBadRequest());
        perform(get("/api/auth/me"), doctor, null).andExpect(jsonPath("$.name").value("Dra. Nova Silva"));
    }

    @Test
    void changesPasswordOnlyWithTheCurrentOne() throws Exception {
        String email = uniqueEmail("paciente");
        String patient = registerPatient(email);

        perform(put("/api/profile/password"), patient, """
                {"currentPassword":"errada","newPassword":"novaSenha1"}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("A senha atual está incorreta."));
        perform(put("/api/profile/password"), patient, """
                {"currentPassword":"segredo123","newPassword":"novaSenha1"}""")
                .andExpect(status().isNoContent());

        perform(post("/api/auth/login"), null, """
                {"email":"%s","password":"segredo123"}""".formatted(email)).andExpect(status().isUnauthorized());
        perform(post("/api/auth/login"), null, """
                {"email":"%s","password":"novaSenha1"}""".formatted(email)).andExpect(status().isOk());
    }

    @Test
    void photoIsVisibleOnlyToTheOwnerAndLinkedUsers() throws Exception {
        String doctor = registerDoctor(uniqueEmail("medico"));
        String email = uniqueEmail("paciente");
        perform(post("/api/doctor/patients"), doctor, "{\"email\":\"" + email + "\"}").andExpect(status().isCreated());
        String patient = registerPatient(email);
        String stranger = registerPatient(uniqueEmail("outro"));

        String body = uploadPhoto(patient, PNG)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.photoUrl").value(startsWith("/api/users/")))
                .andReturn().getResponse().getContentAsString();
        String photoUrl = JsonPath.read(body, "$.photoUrl");

        perform(get(photoUrl), patient, null)
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_PNG))
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("private")));
        perform(get(photoUrl), doctor, null).andExpect(status().isOk());
        perform(get(photoUrl), stranger, null).andExpect(status().isNotFound());

        // A foto aparece para o médico na conversa e na lista de pacientes.
        perform(get("/api/conversations"), doctor, null).andExpect(jsonPath("$[0].counterpart.photoUrl").value(photoUrl));
        perform(get("/api/doctor/patients"), doctor, null).andExpect(jsonPath("$[0].photoUrl").value(photoUrl));

        perform(delete("/api/profile/photo"), patient, null).andExpect(jsonPath("$.photoUrl").doesNotExist());
        perform(get(photoUrl), patient, null).andExpect(status().isNotFound());
    }

    @Test
    void rejectsFilesThatAreNotImages() throws Exception {
        String patient = registerPatient(uniqueEmail("paciente"));

        uploadPhoto(patient, "<script>alert(1)</script>".getBytes())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Envie uma imagem JPG, PNG ou WebP."));
    }

    @Test
    void marketingConsentCanBeGrantedAndRevoked() throws Exception {
        String patient = registerPatient(uniqueEmail("paciente"));

        perform(get("/api/profile"), patient, null)
                .andExpect(jsonPath("$.marketingOptIn").value(false))
                .andExpect(jsonPath("$.consents[*].type").value(hasItem("HEALTH_DATA")));
        perform(put("/api/profile"), patient, """
                {"name":"Paciente Teste","marketingOptIn":true}""")
                .andExpect(jsonPath("$.marketingOptIn").value(true))
                .andExpect(jsonPath("$.consents[*].type").value(hasItem("MARKETING")));
        perform(put("/api/profile"), patient, """
                {"name":"Paciente Teste","marketingOptIn":false}""")
                .andExpect(jsonPath("$.marketingOptIn").value(false))
                .andExpect(jsonPath("$.consents[*].type").value(not(hasItem("MARKETING"))));
    }

    // ---------------------------------------------------------------------

    private ResultActions uploadPhoto(String token, byte[] data) throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "foto.png", "image/png", data);
        return mvc.perform(multipart(HttpMethod.PUT, "/api/profile/photo").file(file)
                .header("Authorization", "Bearer " + token));
    }

    private String registerDoctor(String email) throws Exception {
        return token(perform(post("/api/auth/register/doctor"), null, """
                {"name":"Dra. Teste","email":"%s","password":"segredo123","crm":"12345-SP","specialty":"Clínica",
                 "acceptTerms":true,"acceptPrivacyPolicy":true,"professionalDeclaration":true}""".formatted(email)));
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
