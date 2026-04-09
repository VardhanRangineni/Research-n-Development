package com.medplus.r.d.repository;

import com.medplus.r.d.entity.ProcedureFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProcedureFileRepository extends JpaRepository<ProcedureFile, Long> {
    List<ProcedureFile> findByProjectRefIdOrderByCreatedAtDesc(Long projectRefId);
    List<ProcedureFile> findByProtocolRefIdOrderByCreatedAtDesc(Long protocolRefId);
    List<ProcedureFile> findByProtocolRefIdInOrderByProtocolRefIdAscCreatedAtDesc(List<Long> protocolRefIds);
    Optional<ProcedureFile> findFirstByProtocolRefIdOrderByCreatedAtDesc(Long protocolRefId);
    boolean existsByProjectRefIdAndProtocolRefId(Long projectRefId, Long protocolRefId);
}
