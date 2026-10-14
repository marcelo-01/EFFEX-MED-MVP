package com.effexmed.chat;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    @EntityGraph(attributePaths = { "doctor", "patient" })
    Optional<Conversation> findWithParticipantsById(Long id);

    @EntityGraph(attributePaths = { "doctor", "patient" })
    List<Conversation> findByDoctorId(Long doctorId);

    @EntityGraph(attributePaths = { "doctor", "patient" })
    List<Conversation> findByDoctorIdAndPatientIsNotNull(Long doctorId);

    @EntityGraph(attributePaths = { "doctor", "patient" })
    List<Conversation> findByPatientId(Long patientId);

    List<Conversation> findByPatientEmailAndPatientIsNull(String patientEmail);

    boolean existsByDoctorIdAndPatientEmail(Long doctorId, String patientEmail);

    boolean existsByDoctorIdAndPatientId(Long doctorId, Long patientId);

    List<Conversation> findByDoctorIdOrPatientId(Long doctorId, Long patientId);
}
