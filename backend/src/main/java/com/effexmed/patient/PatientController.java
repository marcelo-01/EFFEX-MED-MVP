package com.effexmed.patient;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.effexmed.common.CurrentUser;

/**
 * Pacientes do médico. O identificador do paciente nesta API é o id da conversa (vínculo médico-paciente).
 */
@RestController
@RequestMapping("/api/doctor/patients")
public class PatientController {

    private final PatientService patientService;

    public PatientController(PatientService patientService) {
        this.patientService = patientService;
    }

    @GetMapping
    public List<PatientDto> list(CurrentUser user) {
        return patientService.list(user.id());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PatientDto register(CurrentUser user, @Valid @RequestBody PatientRequests.Register request) {
        return patientService.register(user.id(), request);
    }

    @PatchMapping("/{id}")
    public PatientDto update(CurrentUser user, @PathVariable Long id, @Valid @RequestBody PatientRequests.Update request) {
        return patientService.update(user.id(), id, request);
    }

    @PostMapping("/{id}/extensions")
    public PatientDto extend(CurrentUser user, @PathVariable Long id, @Valid @RequestBody PatientRequests.Extend request) {
        return patientService.extend(user.id(), id, request);
    }

    @GetMapping("/{id}/extensions")
    public List<ExtensionDto> extensions(CurrentUser user, @PathVariable Long id) {
        return patientService.extensions(user.id(), id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(CurrentUser user, @PathVariable Long id) {
        patientService.remove(user.id(), id);
    }
}
