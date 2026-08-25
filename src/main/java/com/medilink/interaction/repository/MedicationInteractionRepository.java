package com.medilink.interaction.repository;

import com.medilink.interaction.entity.MedicationInteraction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MedicationInteractionRepository extends JpaRepository<MedicationInteraction, Long> {

    List<MedicationInteraction> findAllByUserIdOrderByCheckedAtDesc(Long userId);

    void deleteAllByUserId(Long userId);
}
