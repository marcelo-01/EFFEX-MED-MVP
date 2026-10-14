package com.effexmed.settings;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.effexmed.common.CurrentUser;

@RestController
@RequestMapping("/api/doctor/settings")
public class SettingsController {

    private final SettingsService settingsService;

    public SettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping
    public SettingsDto get(CurrentUser user) {
        return settingsService.get(user.id());
    }

    @PutMapping
    public SettingsDto update(CurrentUser user, @Valid @RequestBody SettingsDto request) {
        return settingsService.update(user.id(), request);
    }
}
