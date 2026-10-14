package com.effexmed.profile;

import java.time.Duration;

import jakarta.validation.Valid;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.effexmed.common.CurrentUser;
import com.effexmed.profile.ProfileDtos.ChangePasswordRequest;
import com.effexmed.profile.ProfileDtos.ProfileDto;
import com.effexmed.profile.ProfileDtos.UpdateProfileRequest;

@RestController
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/api/profile")
    public ProfileDto get(CurrentUser user) {
        return profileService.get(user.id());
    }

    @PutMapping("/api/profile")
    public ProfileDto update(CurrentUser user, @Valid @RequestBody UpdateProfileRequest request) {
        return profileService.update(user.id(), request);
    }

    @PutMapping("/api/profile/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(CurrentUser user, @Valid @RequestBody ChangePasswordRequest request) {
        profileService.changePassword(user.id(), request);
    }

    @PutMapping(path = "/api/profile/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ProfileDto updatePhoto(CurrentUser user, @RequestParam("file") MultipartFile file) {
        return profileService.updatePhoto(user.id(), file);
    }

    @DeleteMapping("/api/profile/photo")
    public ProfileDto removePhoto(CurrentUser user) {
        return profileService.removePhoto(user.id());
    }

    /** A URL inclui a versão da foto (?v=), por isso pode ficar em cache por bastante tempo. */
    @GetMapping("/api/users/{id}/photo")
    public ResponseEntity<byte[]> photo(CurrentUser user, @PathVariable Long id) {
        UserPhoto photo = profileService.photoFor(user.id(), id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(photo.getContentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePrivate())
                .body(photo.getData());
    }
}
