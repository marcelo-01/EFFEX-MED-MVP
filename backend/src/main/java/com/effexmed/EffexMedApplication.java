package com.effexmed;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class EffexMedApplication {

    public static void main(String[] args) {
        SpringApplication.run(EffexMedApplication.class, args);
    }
}
