package com.medplus.r.d.repository;

import com.medplus.r.d.entity.ProjectDocument;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectDocumentRepository extends JpaRepository<ProjectDocument, Long> {
    List<ProjectDocument> findByProject_IdOrderByUploadedAtDesc(Long projectId);

    Page<ProjectDocument> findByProject_IdOrderByUploadedAtDesc(Long projectId, Pageable pageable);

    Optional<ProjectDocument> findByIdAndProject_Id(Long id, Long projectId);
}
