package com.effexmed.settings;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.EnumSet;

import org.junit.jupiter.api.Test;

import com.effexmed.user.User;

class DoctorSettingsTest {

    private static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");

    // 14/10/2026 é uma quarta-feira.
    private static ZonedDateTime wednesdayAt(int hour, int minute) {
        return ZonedDateTime.of(2026, 10, 14, hour, minute, 0, 0, ZONE);
    }

    private static DoctorSettings settings(LocalTime start, LocalTime end) {
        DoctorSettings settings = DoctorSettings.defaultsFor(User.doctor("Dra. Teste", "teste@effexmed.com", "x", "1", null, null));
        settings.update(EnumSet.range(DayOfWeek.MONDAY, DayOfWeek.FRIDAY), start, end, 30, true, 15, true, "Olá!");
        return settings;
    }

    @Test
    void notifiesOnlyInsideTheConfiguredWindow() {
        DoctorSettings settings = settings(LocalTime.of(8, 0), LocalTime.of(18, 0));

        assertThat(settings.isWithinNotificationWindow(wednesdayAt(8, 0))).isTrue();
        assertThat(settings.isWithinNotificationWindow(wednesdayAt(17, 59))).isTrue();
        assertThat(settings.isWithinNotificationWindow(wednesdayAt(18, 0))).isFalse();
        assertThat(settings.isWithinNotificationWindow(wednesdayAt(7, 59))).isFalse();
        assertThat(settings.isWithinNotificationWindow(wednesdayAt(22, 30))).isFalse();
    }

    @Test
    void doesNotNotifyOnDaysOutsideTheSelection() {
        DoctorSettings settings = settings(LocalTime.of(8, 0), LocalTime.of(18, 0));

        ZonedDateTime saturdayNoon = wednesdayAt(12, 0).plusDays(3);
        assertThat(saturdayNoon.getDayOfWeek()).isEqualTo(DayOfWeek.SATURDAY);
        assertThat(settings.isWithinNotificationWindow(saturdayNoon)).isFalse();
    }

    @Test
    void supportsWindowsThatCrossMidnight() {
        DoctorSettings settings = settings(LocalTime.of(20, 0), LocalTime.of(2, 0));

        assertThat(settings.isWithinNotificationWindow(wednesdayAt(23, 0))).isTrue();
        assertThat(settings.isWithinNotificationWindow(wednesdayAt(1, 30))).isTrue();
        assertThat(settings.isWithinNotificationWindow(wednesdayAt(12, 0))).isFalse();
    }

    @Test
    void sameStartAndEndMeansAllDay() {
        DoctorSettings settings = settings(LocalTime.MIDNIGHT, LocalTime.MIDNIGHT);

        assertThat(settings.isWithinNotificationWindow(wednesdayAt(3, 0))).isTrue();
        assertThat(settings.isWithinNotificationWindow(wednesdayAt(23, 59))).isTrue();
    }

    @Test
    void welcomeMessageIsOnlySentWhenEnabledAndFilled() {
        DoctorSettings settings = settings(LocalTime.of(8, 0), LocalTime.of(18, 0));
        assertThat(settings.shouldSendWelcomeMessage()).isTrue();

        settings.update(settings.getNotificationDays(), LocalTime.of(8, 0), LocalTime.of(18, 0), 30, true, 15, true, "   ");
        assertThat(settings.shouldSendWelcomeMessage()).isFalse();

        settings.update(settings.getNotificationDays(), LocalTime.of(8, 0), LocalTime.of(18, 0), 30, true, 15, false, "Olá!");
        assertThat(settings.shouldSendWelcomeMessage()).isFalse();
    }
}
