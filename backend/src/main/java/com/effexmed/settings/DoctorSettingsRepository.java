package com.effexmed.settings;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DoctorSettingsRepository extends JpaRepository<DoctorSettings, Long> {

    Optional<DoctorSettings> findByDoctorId(Long doctorId);

    List<DoctorSettings> findByDoctorIdIn(Collection<Long> doctorIds);
}
