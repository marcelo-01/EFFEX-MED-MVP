package com.effexmed.auth;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.effexmed.auth.AuthDtos.AuthResponse;
import com.effexmed.auth.AuthDtos.LoginRequest;
import com.effexmed.auth.AuthDtos.RegisterDoctorRequest;
import com.effexmed.auth.AuthDtos.RegisterPatientRequest;
import com.effexmed.auth.AuthDtos.UserDto;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register/doctor")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse registerDoctor(@Valid @RequestBody RegisterDoctorRequest request) {
        return authService.registerDoctor(request);
    }

    @PostMapping("/register/patient")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse registerPatient(@Valid @RequestBody RegisterPatientRequest request) {
        return authService.registerPatient(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal Jwt jwt) {
        return authService.me(Long.valueOf(jwt.getSubject()), jwt.getClaimAsString("email"));
    }
}
