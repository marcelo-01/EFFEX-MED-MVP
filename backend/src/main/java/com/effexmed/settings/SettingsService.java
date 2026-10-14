package com.effexmed.settings;

import java.util.Collection;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.effexmed.common.ApiException;

@Service
public class SettingsService {

    private final DoctorSettingsRepository repository;

    public SettingsService(DoctorSettingsRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public DoctorSettings forDoctor(Long doctorId) {
        return repository.findByDoctorId(doctorId)
                .orElseThrow(() -> ApiException.notFound("Configurações do médico não encontradas."));
    }

    @Transactional(readOnly = true)
    public List<DoctorSettings> forDoctors(Collection<Long> doctorIds) {
        return repository.findByDoctorIdIn(doctorIds);
    }

    @Transactional(readOnly = true)
    public SettingsDto get(Long doctorId) {
        return SettingsDto.from(forDoctor(doctorId));
    }

    @Transactional
    public SettingsDto update(Long doctorId, SettingsDto request) {
        DoctorSettings settings = forDoctor(doctorId);
        settings.update(request.notificationDays(), request.notificationStart(), request.notificationEnd(),
                request.welcomeMessageEnabled(), request.welcomeMessage());
        return SettingsDto.from(settings);
    }
}
