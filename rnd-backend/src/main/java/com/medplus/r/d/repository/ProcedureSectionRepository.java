package com.medplus.r.d.repository;

import com.medplus.r.d.entity.ProcedureSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProcedureSectionRepository extends JpaRepository<ProcedureSection, Long> {
    List<ProcedureSection> findByProcedureFileRefIdOrderByStepNoAsc(Long procedureFileRefId);
    void deleteByProcedureFileRefId(Long procedureFileRefId);
    int countByProcedureFileRefId(Long procedureFileRefId);
}
