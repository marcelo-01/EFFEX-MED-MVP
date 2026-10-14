package com.effexmed.config;

import java.time.Duration;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(String timezone, Jwt jwt, boolean demoData, List<String> corsAllowedOrigins) {

    public record Jwt(String secret, Duration ttl) {
    }
}
