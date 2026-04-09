package com.medplus.r.d.repository;

import com.medplus.r.d.entity.StabilityGateCriteria;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StabilityGateCriteriaRepository extends JpaRepository<StabilityGateCriteria, Long> {
    Optional<StabilityGateCriteria> findByProjectRefId(Long projectRefId);
}
