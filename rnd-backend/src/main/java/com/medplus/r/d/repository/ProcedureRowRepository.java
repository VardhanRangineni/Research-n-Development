package com.medplus.r.d.repository;

import com.medplus.r.d.entity.ProcedureRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProcedureRowRepository extends JpaRepository<ProcedureRow, Long> {
    List<ProcedureRow> findBySectionRefIdOrderByRowOrderAsc(Long sectionRefId);
    void deleteBySectionRefId(Long sectionRefId);
    int countBySectionRefId(Long sectionRefId);
}
