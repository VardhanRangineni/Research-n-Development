package com.medplus.r.d.repository;

import com.medplus.r.d.entity.StabilityGateDecision;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StabilityGateDecisionRepository extends JpaRepository<StabilityGateDecision, Long> {
    List<StabilityGateDecision> findByProjectRefIdOrderByDecidedAtDesc(Long projectRefId);
}
