package com.medilink.admin.repository;

import com.medilink.admin.entity.KnowledgeEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KnowledgeEntryRepository extends JpaRepository<KnowledgeEntry, Long> {

    List<KnowledgeEntry> findAllByOrderByMedicationNameAsc();

    boolean existsByItemSeq(String itemSeq);
}
