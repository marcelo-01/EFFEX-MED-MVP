package com.effexmed.chat;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import com.effexmed.user.User;

class ConversationTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 14);

    private static Conversation expiringOn(LocalDate expiresOn) {
        User doctor = User.doctor("Dra. Teste", "teste@effexmed.com", "x", "1", null, Instant.now());
        return new Conversation(doctor, " Paciente@Email.com ", "Paciente", expiresOn, Instant.now());
    }

    @Test
    void normalizesThePatientEmail() {
        assertThat(expiringOn(TODAY).getPatientEmail()).isEqualTo("paciente@email.com");
    }

    @Test
    void isAvailableUntilTheEndOfTheReturnDay() {
        Conversation conversation = expiringOn(TODAY);

        assertThat(conversation.isExpired(TODAY)).isFalse();
        assertThat(conversation.isExpired(TODAY.plusDays(1))).isTrue();
        assertThat(ConversationStatus.of(conversation, TODAY)).isEqualTo(ConversationStatus.EXPIRING_SOON);
        assertThat(ConversationStatus.of(conversation, TODAY.minusDays(10))).isEqualTo(ConversationStatus.ACTIVE);
        assertThat(ConversationStatus.of(conversation, TODAY.plusDays(1))).isEqualTo(ConversationStatus.EXPIRED);
    }

    @Test
    void extendingAnActiveConversationAddsDaysToTheCurrentDeadline() {
        Conversation conversation = expiringOn(TODAY.plusDays(5));

        assertThat(conversation.extend(15, TODAY)).isEqualTo(TODAY.plusDays(20));
    }

    @Test
    void extendingAnExpiredConversationCountsFromToday() {
        Conversation conversation = expiringOn(TODAY.minusDays(10));
        conversation.requestExtension(Instant.now());

        assertThat(conversation.extend(15, TODAY)).isEqualTo(TODAY.plusDays(15));
        assertThat(conversation.getExtensionRequestedAt()).isNull();
    }
}
