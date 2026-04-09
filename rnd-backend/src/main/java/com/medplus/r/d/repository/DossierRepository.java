package com.medplus.r.d.repository;

import com.medplus.r.d.entity.Dossier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DossierRepository extends JpaRepository<Dossier, Long> {
    Optional<Dossier> findByProjectRefId(Long projectRefId);
}
