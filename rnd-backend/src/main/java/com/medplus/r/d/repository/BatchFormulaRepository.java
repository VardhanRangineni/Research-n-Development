package com.medplus.r.d.repository;

import com.medplus.r.d.entity.BatchFormula;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BatchFormulaRepository extends JpaRepository<BatchFormula, Long> {
    List<BatchFormula> findByProjectRefIdOrderByCreatedAtDesc(Long projectRefId);
    List<BatchFormula> findByIdIn(List<Long> ids);
    boolean existsByBatchNameIgnoreCase(String batchName);
}
