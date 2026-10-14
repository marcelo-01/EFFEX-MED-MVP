package com.effexmed.settings;

import java.time.DayOfWeek;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.Set;
import java.util.stream.Collectors;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Persiste os dias da semana como texto, ex.: "MONDAY,TUESDAY,WEDNESDAY".
 */
@Converter
public class DayOfWeekSetConverter implements AttributeConverter<Set<DayOfWeek>, String> {

    @Override
    public String convertToDatabaseColumn(Set<DayOfWeek> days) {
        if (days == null || days.isEmpty()) {
            return "";
        }
        return days.stream().sorted().map(DayOfWeek::name).collect(Collectors.joining(","));
    }

    @Override
    public Set<DayOfWeek> convertToEntityAttribute(String value) {
        EnumSet<DayOfWeek> days = EnumSet.noneOf(DayOfWeek.class);
        if (value != null && !value.isBlank()) {
            Arrays.stream(value.split(",")).map(String::trim).map(DayOfWeek::valueOf).forEach(days::add);
        }
        return days;
    }
}
