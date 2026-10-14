package com.effexmed.config;

import java.time.Clock;
import java.time.ZoneId;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TimeConfig {

    /**
     * Relógio no fuso da clínica. Todas as regras de prazo (data de retorno) e de horário
     * de notificação usam este relógio, o que também facilita os testes.
     */
    @Bean
    public Clock clock(AppProperties properties) {
        return Clock.system(ZoneId.of(properties.timezone()));
    }
}
